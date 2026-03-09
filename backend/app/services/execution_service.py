# backend/app/services/execution_service.py

from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dag import topological_sort, validate_workflow_graph
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.execution_context import ExecutionContext, NodeResult
from app.core.executors import get_executor
from app.models.node_execution_log import NodeExecutionLog
from app.models.workflow import Workflow
from app.models.workflow_run import WorkflowRun

logger = structlog.get_logger()

# Run status constants
STATUS_PENDING = "pending"
STATUS_RUNNING = "running"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
STATUS_TIMED_OUT = "timed_out"

# Node status constants
NODE_PENDING = "pending"
NODE_RUNNING = "running"
NODE_COMPLETED = "completed"
NODE_FAILED = "failed"
NODE_SKIPPED = "skipped"


async def create_workflow_run(
    db: AsyncSession,
    workflow_id: str,
    owner_id: str,
    trigger_type: str = "manual",
    trigger_input: dict | None = None,
) -> WorkflowRun:
    """
    Create a new workflow run record.

    Steps:
    1. Fetch and validate the workflow
    2. Validate the graph structure
    3. Check concurrency policy
    4. Create the run record in PENDING status

    Returns the created WorkflowRun.
    """
    # Step 1: Fetch workflow
    query = select(Workflow).where(Workflow.id == workflow_id)
    result = await db.execute(query)
    workflow = result.scalar_one_or_none()

    if workflow is None:
        raise NotFoundException("Workflow", workflow_id)

    if workflow.owner_id != owner_id:
        from app.core.exceptions import ForbiddenException

        raise ForbiddenException()

    if not workflow.is_active:
        raise BadRequestException("Cannot execute an inactive workflow")

    # Step 2: Validate graph
    graph_data = workflow.graph_data
    if not graph_data or not graph_data.get("nodes"):
        raise BadRequestException("Workflow has no nodes. Add nodes before executing.")

    validate_workflow_graph(graph_data)

    # Step 3: Check concurrency policy
    await _check_concurrency(db, workflow)

    # Step 4: Create run record
    run = WorkflowRun(
        workflow_id=workflow.id,
        workflow_version=workflow.version,
        status=STATUS_PENDING,
        trigger_type=trigger_type,
        trigger_input=trigger_input or {},
        execution_context={},
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)

    logger.info(
        "workflow_run_created",
        run_id=run.id,
        workflow_id=workflow.id,
        trigger_type=trigger_type,
    )

    return run


async def execute_workflow_run(
    db: AsyncSession,
    run_id: str,
) -> WorkflowRun:
    """
    Execute a workflow run.

    This is the main orchestration function. It:
    1. Loads the run and its workflow
    2. Builds the execution order via topological sort
    3. Creates the ExecutionContext
    4. Executes each node sequentially
    5. Updates the run status and context after each node
    6. Handles failures and node skipping

    Returns the completed WorkflowRun.
    """
    # Load run
    query = select(WorkflowRun).where(WorkflowRun.id == run_id)
    result = await db.execute(query)
    run = result.scalar_one_or_none()

    if run is None:
        raise NotFoundException("WorkflowRun", run_id)

    # Load workflow
    wf_query = select(Workflow).where(Workflow.id == run.workflow_id)
    wf_result = await db.execute(wf_query)
    workflow = wf_result.scalar_one_or_none()

    if workflow is None:
        # Workflow was deleted after run was created
        run.status = STATUS_FAILED
        run.workflow_deleted = True
        run.completed_at = datetime.now(timezone.utc)
        await db.flush()
        return run

    graph_data = workflow.graph_data

    # Build node lookup
    node_map = {node["id"]: node for node in graph_data.get("nodes", [])}

    # Get execution order
    execution_order = topological_sort(graph_data)

    # Find the trigger node
    trigger_id = None
    for node in graph_data.get("nodes", []):
        if node.get("type") == "trigger":
            trigger_id = node["id"]
            break

    # Update run status to RUNNING
    run.status = STATUS_RUNNING
    run.started_at = datetime.now(timezone.utc)
    await db.flush()

    # Create execution context
    context = ExecutionContext(run_id=run.id, workflow_id=workflow.id)

    # Set trigger output from the run's trigger_input
    if trigger_id:
        context.set_trigger_output(
            trigger_id,
            {
                "webhook_body": run.trigger_input,
            },
        )

    # Track which nodes have failed (for skip logic)
    failed_nodes: set[str] = set()

    # Build dependency map (node_id -> set of upstream node_ids)
    dependencies = _build_dependency_map(graph_data)

    # Execute nodes in order
    for node_id in execution_order:
        node_data = node_map.get(node_id)
        if node_data is None:
            continue

        node_type = node_data.get("type", "")
        node_config = node_data.get("config", {})

        # Check if any upstream dependency failed
        upstream_failed = dependencies.get(node_id, set()) & failed_nodes
        if upstream_failed:
            # Skip this node
            skip_result = NodeResult(
                status=NODE_SKIPPED,
                error=f"Skipped: upstream node(s) failed: {', '.join(upstream_failed)}",
            )
            context.set_node_result(node_id, skip_result)
            await _log_node_execution(db, run.id, node_id, node_type, skip_result)
            failed_nodes.add(node_id)

            logger.info(
                "node_skipped",
                node_id=node_id,
                reason=f"upstream failed: {upstream_failed}",
                run_id=run.id,
            )
            continue

        # Create pending log entry
        log_entry = NodeExecutionLog(
            run_id=run.id,
            node_id=node_id,
            node_type=node_type,
            status=NODE_RUNNING,
            input=node_config,
            attempt=1,
        )
        db.add(log_entry)
        await db.flush()

        # Get the executor and run it
        executor = get_executor(node_type)
        node_result = await executor.execute(
            node_id=node_id,
            node_type=node_type,
            node_config=node_config,
            context=context,
        )

        # Store result in context
        context.set_node_result(node_id, node_result)

        # Update log entry
        log_entry.status = node_result.status
        log_entry.output = node_result.output
        log_entry.error = node_result.error
        log_entry.duration_ms = node_result.duration_ms
        await db.flush()

        # Track failures
        if node_result.status == NODE_FAILED:
            failed_nodes.add(node_id)
            logger.warning(
                "node_execution_failed",
                node_id=node_id,
                error=node_result.error,
                run_id=run.id,
            )

    # Determine final run status
    if failed_nodes:
        run.status = STATUS_FAILED
    else:
        run.status = STATUS_COMPLETED

    run.completed_at = datetime.now(timezone.utc)
    run.execution_context = context.to_dict()
    await db.flush()

    logger.info(
        "workflow_run_finished",
        run_id=run.id,
        workflow_id=workflow.id,
        status=run.status,
        total_nodes=len(execution_order),
        failed_nodes=len(failed_nodes),
    )

    return run


async def get_run_with_logs(
    db: AsyncSession,
    run_id: str,
    owner_id: str,
) -> dict:
    """
    Fetch a workflow run with its node execution logs.

    Returns a dict with run details and per-node statuses.
    """
    # Load run
    query = select(WorkflowRun).where(WorkflowRun.id == run_id)
    result = await db.execute(query)
    run = result.scalar_one_or_none()

    if run is None:
        raise NotFoundException("WorkflowRun", run_id)

    # Verify ownership through workflow
    wf_query = select(Workflow).where(Workflow.id == run.workflow_id)
    wf_result = await db.execute(wf_query)
    workflow = wf_result.scalar_one_or_none()

    if workflow and workflow.owner_id != owner_id:
        from app.core.exceptions import ForbiddenException

        raise ForbiddenException()

    # Load logs
    logs_query = (
        select(NodeExecutionLog)
        .where(NodeExecutionLog.run_id == run_id)
        .order_by(NodeExecutionLog.created_at.asc())
    )
    logs_result = await db.execute(logs_query)
    logs = list(logs_result.scalars().all())

    # Build node statuses
    node_statuses = {}
    for log in logs:
        node_statuses[log.node_id] = {
            "status": log.status,
            "duration_ms": log.duration_ms,
            "output": log.output,
            "error": log.error,
            "attempt": log.attempt,
        }

    # Calculate duration
    duration_ms = None
    if run.started_at and run.completed_at:
        delta = run.completed_at - run.started_at
        duration_ms = round(delta.total_seconds() * 1000)

    return {
        "run_id": run.id,
        "workflow_id": run.workflow_id,
        "workflow_version": run.workflow_version,
        "status": run.status,
        "trigger_type": run.trigger_type,
        "trigger_input": run.trigger_input,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "duration_ms": duration_ms,
        "node_statuses": node_statuses,
        "execution_context": run.execution_context,
    }


# --- Private helpers ---


async def _check_concurrency(db: AsyncSession, workflow: Workflow) -> None:
    """
    Check the workflow's concurrency policy.

    - allow_parallel: always allow (default)
    - skip: reject if a run is already in progress
    - queue: allow (actual queuing handled by Celery in Phase 5)
    """
    policy = workflow.concurrency_policy or "allow_parallel"

    if policy == "allow_parallel":
        return

    if policy == "skip":
        # Check for active runs
        active_query = select(WorkflowRun).where(
            WorkflowRun.workflow_id == workflow.id,
            WorkflowRun.status.in_([STATUS_PENDING, STATUS_RUNNING]),
        )
        result = await db.execute(active_query)
        active_run = result.scalar_one_or_none()

        if active_run:
            raise BadRequestException(
                f"Workflow has an active run ({active_run.id}). "
                f"Concurrency policy is 'skip'."
            )

    # "queue" policy: allow creation, ordering handled by worker


def _build_dependency_map(graph_data: dict) -> dict[str, set[str]]:
    """
    Build a map of node_id -> set of all upstream node IDs (direct parents).

    Used to determine if a node should be skipped due to upstream failure.
    """
    edges = graph_data.get("edges", [])
    deps: dict[str, set[str]] = {}

    for edge in edges:
        target = edge["target"]
        source = edge["source"]
        if target not in deps:
            deps[target] = set()
        deps[target].add(source)

    return deps


async def _log_node_execution(
    db: AsyncSession,
    run_id: str,
    node_id: str,
    node_type: str,
    result: NodeResult,
) -> None:
    """Create a node execution log entry."""
    log = NodeExecutionLog(
        run_id=run_id,
        node_id=node_id,
        node_type=node_type,
        status=result.status,
        output=result.output,
        error=result.error,
        duration_ms=result.duration_ms,
        attempt=1,
    )
    db.add(log)
    await db.flush()
