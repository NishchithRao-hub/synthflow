# backend/app/routers/billing.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.billing import BillingUsageResponse
from app.services import usage_service

router = APIRouter(prefix="/api/billing", tags=["Billing"])


@router.get("/usage", response_model=BillingUsageResponse)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current billing cycle usage and limits."""
    usage = await usage_service.get_usage_summary(db, current_user.id)
    return BillingUsageResponse(**usage)
