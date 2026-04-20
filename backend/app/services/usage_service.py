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


async def get_usage_summary(
    db: AsyncSession,
    user_id: str,
    billing_cycle: tuple[datetime, datetime] | None = None,
    billing_cycle_source: str = "fallback",
) -> dict:
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

    cycle_start, cycle_end = billing_cycle or _get_default_cycle_boundaries()

    # Count workflows
    workflow_count = (
        await db.execute(
            select(func.count())
            .select_from(Workflow)
            .where(Workflow.owner_id == user_id)
        )
    ).scalar_one()

    # Count workflow runs in current billing cycle
    run_count = (
        await db.execute(
            select(func.count())
            .select_from(UsageRecord)
            .where(
                UsageRecord.user_id == user_id,
                UsageRecord.event_type == "workflow_run",
                UsageRecord.recorded_at >= cycle_start,
                UsageRecord.recorded_at < cycle_end,
            )
        )
    ).scalar_one()

    # Count AI calls in current billing cycle
    ai_count = (
        await db.execute(
            select(func.count())
            .select_from(UsageRecord)
            .where(
                UsageRecord.user_id == user_id,
                UsageRecord.event_type == "ai_call",
                UsageRecord.recorded_at >= cycle_start,
                UsageRecord.recorded_at < cycle_end,
            )
        )
    ).scalar_one()

    return {
        "plan": user.plan,
        "billing_cycle_start": cycle_start.isoformat(),
        "billing_cycle_end": cycle_end.isoformat(),
        "billing_cycle_source": billing_cycle_source,
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
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if not user:
        return False, "User not found"

    billing_cycle = await _get_effective_billing_cycle(db, user)
    usage = await get_usage_summary(
        db,
        user_id,
        billing_cycle=billing_cycle,
        billing_cycle_source="stripe" if billing_cycle else "fallback",
    )
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
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if not user:
        return False, "User not found"

    billing_cycle = await _get_effective_billing_cycle(db, user)
    usage = await get_usage_summary(
        db,
        user_id,
        billing_cycle=billing_cycle,
        billing_cycle_source="stripe" if billing_cycle else "fallback",
    )
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


def _get_default_cycle_boundaries() -> tuple[datetime, datetime]:
    """Get default monthly cycle boundaries in UTC.

    Falls back to calendar month boundaries when Stripe cycle data is unavailable.
    """
    now = datetime.now(timezone.utc)
    cycle_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    if now.month == 12:
        cycle_end = now.replace(
            year=now.year + 1,
            month=1,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
    else:
        cycle_end = now.replace(
            month=now.month + 1,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    return cycle_start, cycle_end


async def _get_effective_billing_cycle(
    db: AsyncSession, user: User
) -> tuple[datetime, datetime] | None:
    if not user.stripe_customer_id:
        return None

    from app.services import stripe_service

    try:
        (
            _,
            billing_cycle,
        ) = await stripe_service.sync_user_subscription_state_from_stripe(
            db,
            user,
        )
        return billing_cycle
    except Exception:
        logger.warning(
            "stripe_billing_cycle_lookup_failed",
            user_id=user.id,
            customer_id=user.stripe_customer_id,
        )
        return None
