# backend/app/services/usage_service_sync.py

import structlog
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.plans import get_plan_limits
from app.models.usage_record import UsageRecord
from app.models.user import User

logger = structlog.get_logger()


def check_ai_limit_sync(db: Session, user_id: str) -> tuple[bool, str | None]:
    """
    Synchronous version of AI call limit check for the Celery worker.

    Returns (can_call, error_message).
    """
    from datetime import datetime, timezone

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()

    if not user:
        return False, "User not found"

    plan = get_plan_limits(user.plan)

    now = datetime.now(timezone.utc)
    cycle_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    ai_count = db.execute(
        select(func.count())
        .select_from(UsageRecord)
        .where(
            UsageRecord.user_id == user_id,
            UsageRecord.event_type == "ai_call",
            UsageRecord.recorded_at >= cycle_start,
        )
    ).scalar_one()

    if ai_count >= plan.ai_calls_per_month:
        return False, (
            f"Monthly AI call limit reached ({plan.ai_calls_per_month} calls). "
            f"Upgrade to Pro for more AI calls."
        )

    return True, None


def record_ai_call_sync(
    db: Session, user_id: str, workflow_id: str, run_id: str
) -> None:
    """Record an AI node call usage event (sync for worker)."""
    record = UsageRecord(
        user_id=user_id,
        event_type="ai_call",
        workflow_id=workflow_id,
        run_id=run_id,
    )
    db.add(record)
    db.flush()
