# backend/app/worker/tasks.py

import structlog
from celery import states

from app.worker.celery_app import celery_app
from app.worker.database import get_worker_db, run_async

logger = structlog.get_logger()


@celery_app.task(
    name="app.worker.tasks.execute_workflow_run_task",
    bind=True,
    max_retries=0,
    acks_late=True,
    queue="execution",
)
def execute_workflow_run_task(self, run_id: str) -> dict:
    """
    Celery task that executes a workflow run in the background.

    This is a synchronous Celery task that bridges to our async
    execution service via run_async().

    Args:
        run_id: The WorkflowRun ID to execute

    Returns:
        Dict with run_id, status, and duration_ms
    """
    logger.info(
        "celery_task_started",
        task_id=self.request.id,
        run_id=run_id,
    )

    # Update task state to STARTED
    self.update_state(state=states.STARTED, meta={"run_id": run_id})

    try:
        result = run_async(_execute(run_id))

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

        # Mark the run as failed in the database
        try:
            run_async(_mark_run_failed(run_id, str(e)))
        except Exception as db_err:
            logger.error(
                "celery_task_cleanup_failed",
                run_id=run_id,
                error=str(db_err),
            )

        raise


async def _execute(run_id: str) -> dict:
    """
    Async function that performs the actual workflow execution.

    Runs inside its own database session, separate from the API.
    """
    from app.services.execution_service import execute_workflow_run

    async with get_worker_db() as db:
        run = await execute_workflow_run(db=db, run_id=run_id)

        # Calculate duration
        duration_ms = None
        if run.started_at and run.completed_at:
            delta = run.completed_at - run.started_at
            duration_ms = round(delta.total_seconds() * 1000)

        return {
            "run_id": run.id,
            "workflow_id": run.workflow_id,
            "status": run.status,
            "duration_ms": duration_ms,
        }


async def _mark_run_failed(run_id: str, error: str) -> None:
    """
    Mark a run as failed if the task crashes unexpectedly.

    This is a safety net for unhandled exceptions.
    """
    from datetime import datetime, timezone

    from sqlalchemy import select

    from app.models.workflow_run import WorkflowRun

    async with get_worker_db() as db:
        query = select(WorkflowRun).where(WorkflowRun.id == run_id)
        result = await db.execute(query)
        run = result.scalar_one_or_none()

        if run and run.status in ("pending", "running"):
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.execution_context = {
                "error": f"Task failed unexpectedly: {error}",
            }
            await db.flush()
            logger.info("run_marked_failed", run_id=run_id, error=error)
