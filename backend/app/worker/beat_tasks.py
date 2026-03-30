# backend/app/worker/beat_tasks.py

from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import select

from app.models.workflow_run import WorkflowRun
from app.worker.celery_app import celery_app
from app.worker.database import get_worker_db

logger = structlog.get_logger()

# Runs stuck longer than this are considered dead
STUCK_RUN_THRESHOLD_MINUTES = 10


@celery_app.task(
    name="app.worker.beat_tasks.recover_dead_runs",
    queue="default",
)
def recover_dead_runs() -> dict:
    """
    Periodic task that finds and recovers stuck workflow runs.

    A run is considered stuck if it has been in 'pending' or 'running'
    status for longer than STUCK_RUN_THRESHOLD_MINUTES.

    These runs are marked as 'timed_out' so they don't block
    concurrency policies and are visible in the run history.
    """
    logger.info("dead_run_recovery_started")

    threshold = datetime.now(timezone.utc) - timedelta(
        minutes=STUCK_RUN_THRESHOLD_MINUTES
    )
    recovered_count = 0
    recovered_ids = []

    with get_worker_db() as db:
        # Find stuck runs
        query = select(WorkflowRun).where(
            WorkflowRun.status.in_(["pending", "running"]),
            WorkflowRun.created_at < threshold,
        )
        result = db.execute(query)
        stuck_runs = list(result.scalars().all())

        if not stuck_runs:
            logger.info("dead_run_recovery_complete", recovered=0)
            return {"recovered": 0, "run_ids": []}

        for run in stuck_runs:
            run.status = "timed_out"
            run.completed_at = datetime.now(timezone.utc)
            run.execution_context = {
                **(run.execution_context or {}),
                "recovery": {
                    "reason": "Run exceeded stuck threshold",
                    "threshold_minutes": STUCK_RUN_THRESHOLD_MINUTES,
                    "recovered_at": datetime.now(timezone.utc).isoformat(),
                    "original_status": run.status,
                },
            }

            recovered_count += 1
            recovered_ids.append(run.id)

            logger.warning(
                "dead_run_recovered",
                run_id=run.id,
                workflow_id=run.workflow_id,
                original_status=run.status,
                created_at=run.created_at.isoformat() if run.created_at else None,
                stuck_minutes=STUCK_RUN_THRESHOLD_MINUTES,
            )

        db.flush()

    logger.info(
        "dead_run_recovery_complete",
        recovered=recovered_count,
        run_ids=recovered_ids,
    )

    return {
        "recovered": recovered_count,
        "run_ids": recovered_ids,
    }


@celery_app.task(
    name="app.worker.beat_tasks.cleanup_old_runs",
    queue="default",
)
def cleanup_old_runs() -> dict:
    """
    Periodic task that cleans up old completed/failed run data.

    Removes execution_context (large JSON) from runs older than
    30 days to save database space. The run record and node logs
    are preserved.
    """
    logger.info("old_run_cleanup_started")

    threshold = datetime.now(timezone.utc) - timedelta(days=30)
    cleaned_count = 0

    with get_worker_db() as db:
        query = select(WorkflowRun).where(
            WorkflowRun.status.in_(["completed", "failed", "timed_out"]),
            WorkflowRun.completed_at < threshold,
            WorkflowRun.execution_context != {},
        )
        result = db.execute(query)
        old_runs = list(result.scalars().all())

        for run in old_runs:
            run.execution_context = {
                "_cleaned": True,
                "_cleaned_at": datetime.now(timezone.utc).isoformat(),
            }
            cleaned_count += 1

        if cleaned_count > 0:
            db.flush()

    logger.info("old_run_cleanup_complete", cleaned=cleaned_count)

    return {"cleaned": cleaned_count}
