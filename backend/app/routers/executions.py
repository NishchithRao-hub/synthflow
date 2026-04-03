# backend/app/routers/executions.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.workflow_run import WorkflowRun
from app.schemas.execution import (
    ExecuteWorkflowRequest,
    ExecuteWorkflowResponse,
    RunDetailResponse,
    RunListItem,
    RunListResponse,
)
from app.services import execution_service

router = APIRouter(prefix="/api", tags=["Execution"])


@router.post(
    "/workflows/{workflow_id}/execute",
    response_model=ExecuteWorkflowResponse,
    status_code=202,
)
async def execute_workflow(
    workflow_id: str,
    data: ExecuteWorkflowRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a manual workflow execution.

    Checks usage limits, creates a run record, records usage,
    enqueues for async execution via Celery, and returns 202 immediately.
    """
    from app.services import usage_service
    from app.worker.tasks import execute_workflow_run_task

    # Check run limit
    can_execute, error_msg = await usage_service.check_can_execute(db, current_user.id)
    if not can_execute:
        from app.core.exceptions import UsageLimitExceededException

        raise UsageLimitExceededException("workflow_runs", 0)

    # Create the run record
    run = await execution_service.create_workflow_run(
        db=db,
        workflow_id=workflow_id,
        owner_id=current_user.id,
        trigger_type="manual",
        trigger_input=data.input,
    )

    # Record usage
    await usage_service.record_workflow_run(
        db=db,
        user_id=current_user.id,
        workflow_id=workflow_id,
        run_id=run.id,
    )

    # Enqueue for async execution
    execute_workflow_run_task.delay(run.id)

    return ExecuteWorkflowResponse(
        run_id=run.id,
        workflow_id=run.workflow_id,
        status=run.status,
        created_at=run.created_at,
    )


@router.get("/runs/{run_id}", response_model=RunDetailResponse)
async def get_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed execution status and results for a workflow run."""
    result = await execution_service.get_run_with_logs(
        db=db,
        run_id=run_id,
        owner_id=current_user.id,
    )
    return RunDetailResponse(**result)


@router.get(
    "/workflows/{workflow_id}/runs",
    response_model=RunListResponse,
)
async def list_workflow_runs(
    workflow_id: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all runs for a specific workflow."""
    # Count total
    count_query = (
        select(func.count())
        .select_from(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow_id)
    )
    if status:
        count_query = count_query.where(WorkflowRun.status == status)

    result = await db.execute(count_query)
    total = result.scalar_one()

    # Fetch page
    offset = (page - 1) * per_page
    query = (
        select(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow_id)
        .order_by(WorkflowRun.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    if status:
        query = query.where(WorkflowRun.status == status)

    result = await db.execute(query)
    runs = list(result.scalars().all())

    return RunListResponse(
        runs=[
            RunListItem(
                id=r.id,
                workflow_id=r.workflow_id,
                status=r.status,
                trigger_type=r.trigger_type,
                started_at=r.started_at,
                completed_at=r.completed_at,
                created_at=r.created_at,
            )
            for r in runs
        ],
        total=total,
        page=page,
        per_page=per_page,
    )
