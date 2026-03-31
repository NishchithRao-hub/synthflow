# backend/app/services/usage_service.py

from datetime import datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.plans import get_plan_limits
from app.models.usage_record import UsageRecord
from app.models.user import User
from app.models.workflow import Workflow

logger = structlog.get_logger()


async def get_usage_summary(db: AsyncSession, user_id: str) -> dict:
    """
    Get the current billing cycle usage for a user.

    Returns usage counts and limits for the user's plan.
    """
    # Get user and plan
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if not user:
        return {}

    plan = get_plan_limits(user.plan)

    # Get billing cycle boundaries (first of current month)
    now = datetime.now(timezone.utc)
    cycle_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Count workflows
    workflow_count = (
        await db.execute(
            select(func.count())
            .select_from(Workflow)
            .where(Workflow.owner_id == user_id)
        )
    ).scalar_one()

    # Count workflow runs this month
    run_count = (
        await db.execute(
            select(func.count())
            .select_from(UsageRecord)
            .where(
                UsageRecord.user_id == user_id,
                UsageRecord.event_type == "workflow_run",
                UsageRecord.recorded_at >= cycle_start,
            )
        )
    ).scalar_one()

    # Count AI calls this month
    ai_count = (
        await db.execute(
            select(func.count())
            .select_from(UsageRecord)
            .where(
                UsageRecord.user_id == user_id,
                UsageRecord.event_type == "ai_call",
                UsageRecord.recorded_at >= cycle_start,
            )
        )
    ).scalar_one()

    return {
        "plan": user.plan,
        "billing_cycle_start": cycle_start.isoformat(),
        "billing_cycle_end": _get_cycle_end(now).isoformat(),
        "usage": {
            "workflows": {"used": workflow_count, "limit": plan.workflows},
            "workflow_runs": {"used": run_count, "limit": plan.runs_per_month},
            "ai_node_calls": {"used": ai_count, "limit": plan.ai_calls_per_month},
        },
    }


async def check_can_execute(db: AsyncSession, user_id: str) -> tuple[bool, str | None]:
    """
    Check if a user can execute a workflow based on their plan limits.

    Returns (can_execute, error_message).
    """
    usage = await get_usage_summary(db, user_id)
    if not usage:
        return False, "User not found"

    runs = usage["usage"]["workflow_runs"]
    if runs["used"] >= runs["limit"]:
        return False, (
            f"Monthly workflow run limit reached ({runs['limit']} runs). "
            f"Upgrade to Pro for more runs."
        )

    return True, None


async def check_can_create_workflow(
    db: AsyncSession, user_id: str
) -> tuple[bool, str | None]:
    """
    Check if a user can create a new workflow based on their plan limits.

    Returns (can_create, error_message).
    """
    usage = await get_usage_summary(db, user_id)
    if not usage:
        return False, "User not found"

    workflows = usage["usage"]["workflows"]
    if workflows["used"] >= workflows["limit"]:
        return False, (
            f"Workflow limit reached ({workflows['limit']} workflows). "
            f"Upgrade to Pro for unlimited workflows."
        )

    return True, None


async def record_workflow_run(
    db: AsyncSession, user_id: str, workflow_id: str, run_id: str
) -> None:
    """Record a workflow run usage event."""
    record = UsageRecord(
        user_id=user_id,
        event_type="workflow_run",
        workflow_id=workflow_id,
        run_id=run_id,
    )
    db.add(record)
    await db.flush()

    logger.info(
        "usage_recorded",
        event_type="workflow_run",
        user_id=user_id,
        workflow_id=workflow_id,
    )


async def record_ai_call(
    db: AsyncSession, user_id: str, workflow_id: str, run_id: str
) -> None:
    """Record an AI node call usage event."""
    record = UsageRecord(
        user_id=user_id,
        event_type="ai_call",
        workflow_id=workflow_id,
        run_id=run_id,
    )
    db.add(record)
    await db.flush()


def _get_cycle_end(now: datetime) -> datetime:
    """Get the last moment of the current billing cycle (end of month)."""
    if now.month == 12:
        return now.replace(
            year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )
    return now.replace(
        month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0
    )
