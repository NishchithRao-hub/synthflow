# backend/app/worker/tasks.py

import asyncio
from datetime import datetime, timezone

import structlog
from celery import states
from sqlalchemy import select

from app.core.dag import topological_sort, validate_workflow_graph
from app.core.execution_context import ExecutionContext, NodeResult
from app.core.executors import get_executor
from app.models.node_execution_log import NodeExecutionLog
from app.models.workflow import Workflow
from app.models.workflow_run import WorkflowRun
from app.worker.celery_app import celery_app
from app.worker.database import get_worker_db

logger = structlog.get_logger()

# Status constants
STATUS_RUNNING = "running"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
NODE_COMPLETED = "completed"
NODE_FAILED = "failed"
NODE_SKIPPED = "skipped"


@celery_app.task(
    name="app.worker.tasks.execute_workflow_run_task",
    bind=True,
    max_retries=0,
    acks_late=True,
    queue="execution",
)
def execute_workflow_run_task(self, run_id: str) -> dict:
    """
    Celery task that executes a workflow run synchronously.

    Uses sync DB sessions for database access and asyncio.run()
    only for async executor calls (HTTP, LLM).
    """
    logger.info(
        "celery_task_started",
        task_id=self.request.id,
        run_id=run_id,
    )

    self.update_state(state=states.STARTED, meta={"run_id": run_id})

    # Bind run context for structured logging
    import structlog as structlog_module

    structlog_module.contextvars.clear_contextvars()
    structlog_module.contextvars.bind_contextvars(
        run_id=run_id,
        task_id=self.request.id,
    )

    try:
        result = _execute_run(run_id)

        logger.info(
            "celery_task_completed",
            task_id=self.request.id,
            run_id=run_id,
            status=result["status"],
            duration_ms=result["duration_ms"],
        )

        return result

    except Exception as e:
        logger.error(
            "celery_task_failed",
            task_id=self.request.id,
            run_id=run_id,
            error=str(e),
        )

        try:
            _mark_run_failed(run_id, str(e))
        except Exception as db_err:
            logger.error(
                "celery_task_cleanup_failed",
                run_id=run_id,
                error=str(db_err),
            )

        raise


def _execute_run(run_id: str) -> dict:
    """Execute a workflow run using sync DB and async executors."""
    from app.core.pubsub import (
        publish_node_status,
        publish_run_completed,
        publish_run_started,
    )

    with get_worker_db() as db:
        # Load run
        run = db.execute(
            select(WorkflowRun).where(WorkflowRun.id == run_id)
        ).scalar_one_or_none()

        if run is None:
            raise RuntimeError(f"WorkflowRun {run_id} not found")

        # Load workflow
        workflow = db.execute(
            select(Workflow).where(Workflow.id == run.workflow_id)
        ).scalar_one_or_none()

        if workflow is None:
            run.status = STATUS_FAILED
            run.workflow_deleted = True
            run.completed_at = datetime.now(timezone.utc)
            db.flush()
            return {
                "run_id": run.id,
                "workflow_id": run.workflow_id,
                "status": STATUS_FAILED,
                "duration_ms": 0,
            }

        graph_data = workflow.graph_data
        node_map = {node["id"]: node for node in graph_data.get("nodes", [])}

        # Validate and sort
        validate_workflow_graph(graph_data)
        execution_order = topological_sort(graph_data)

        # Find trigger node
        trigger_id = None
        for node in graph_data.get("nodes", []):
            if node.get("type") == "trigger":
                trigger_id = node["id"]
                break

        # Update run status
        run.status = STATUS_RUNNING
        run.started_at = datetime.now(timezone.utc)
        db.flush()

        # Publish run started
        publish_run_started(run.id, workflow.id)

        # Create execution context
        context = ExecutionContext(run_id=run.id, workflow_id=workflow.id)

        if trigger_id:
            context.set_trigger_output(
                trigger_id,
                {
                    "webhook_body": run.trigger_input,
                },
            )

        # Track failures
        failed_nodes: set[str] = set()
        dependencies = _build_dependency_map(graph_data)

        # Execute nodes
        for node_id in execution_order:
            node_data = node_map.get(node_id)
            if node_data is None:
                continue

            node_type = node_data.get("type", "")
            node_config = node_data.get("config", {})

            # Check upstream failures
            upstream_failed = dependencies.get(node_id, set()) & failed_nodes
            if upstream_failed:
                skip_result = NodeResult(
                    status=NODE_SKIPPED,
                    error=f"Skipped: upstream node(s) failed: {', '.join(upstream_failed)}",
                )
                context.set_node_result(node_id, skip_result)
                _create_node_log(db, run.id, node_id, node_type, skip_result)
                failed_nodes.add(node_id)

                # Publish skip
                publish_node_status(
                    run.id,
                    node_id,
                    node_type,
                    NODE_SKIPPED,
                    error=skip_result.error,
                )
                continue

            # Publish node running
            publish_node_status(run.id, node_id, node_type, "running")

            # Create running log entry
            log_entry = NodeExecutionLog(
                run_id=run.id,
                node_id=node_id,
                node_type=node_type,
                status="running",
                input=node_config,
                attempt=1,
            )
            db.add(log_entry)
            db.flush()

            # Execute the node
            executor = get_executor(node_type)
            node_result = asyncio.run(
                executor.execute(
                    node_id=node_id,
                    node_type=node_type,
                    node_config=node_config,
                    context=context,
                )
            )

            # Store result
            context.set_node_result(node_id, node_result)

            # Update log
            log_entry.status = node_result.status
            log_entry.output = node_result.output
            log_entry.error = node_result.error
            log_entry.duration_ms = node_result.duration_ms
            db.flush()

            # Publish node result
            publish_node_status(
                run.id,
                node_id,
                node_type,
                node_result.status,
                duration_ms=node_result.duration_ms,
                output=node_result.output,
                error=node_result.error,
            )

            if node_result.status == NODE_FAILED:
                failed_nodes.add(node_id)
                logger.warning(
                    "node_execution_failed",
                    node_id=node_id,
                    error=node_result.error,
                    run_id=run.id,
                )

        # Finalize run
        run.status = STATUS_FAILED if failed_nodes else STATUS_COMPLETED
        run.completed_at = datetime.now(timezone.utc)
        run.execution_context = context.to_dict()
        db.flush()

        # Calculate duration
        duration_ms = None
        started_at = run.started_at
        completed_at = run.completed_at
        if started_at is not None and completed_at is not None:
            delta = completed_at - started_at
            duration_ms = round(delta.total_seconds() * 1000)

        # Publish run completed
        publish_run_completed(run.id, workflow.id, run.status, duration_ms)

        logger.info(
            "workflow_run_finished",
            run_id=run.id,
            workflow_id=workflow.id,
            status=run.status,
            total_nodes=len(execution_order),
            failed_nodes=len(failed_nodes),
        )

        return {
            "run_id": run.id,
            "workflow_id": run.workflow_id,
            "status": run.status,
            "duration_ms": duration_ms,
        }


def _mark_run_failed(run_id: str, error: str) -> None:
    """Mark a run as failed if the task crashes unexpectedly."""
    with get_worker_db() as db:
        run = db.execute(
            select(WorkflowRun).where(WorkflowRun.id == run_id)
        ).scalar_one_or_none()

        if run and run.status in ("pending", "running"):
            run.status = STATUS_FAILED
            run.completed_at = datetime.now(timezone.utc)
            run.execution_context = {
                "error": f"Task failed unexpectedly: {error}",
            }
            db.flush()


def _build_dependency_map(graph_data: dict) -> dict[str, set[str]]:
    """Build node_id -> set of direct upstream node_ids."""
    edges = graph_data.get("edges", [])
    deps: dict[str, set[str]] = {}
    for edge in edges:
        target = edge["target"]
        source = edge["source"]
        if target not in deps:
            deps[target] = set()
        deps[target].add(source)
    return deps


def _create_node_log(
    db, run_id: str, node_id: str, node_type: str, result: NodeResult
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
    db.flush()
