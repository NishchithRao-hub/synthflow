# backend/app/routers/billing.py

import stripe
import structlog
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_factory, get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.billing import BillingUsageResponse, CheckoutResponse, PortalResponse
from app.services import stripe_service, usage_service

logger = structlog.get_logger()

router = APIRouter(prefix="/api/billing", tags=["Billing"])


@router.get("/usage", response_model=BillingUsageResponse)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current billing cycle usage and limits."""
    usage = await usage_service.get_usage_summary(db, current_user.id)
    return BillingUsageResponse(**usage)


@router.post("/create-checkout-session", response_model=CheckoutResponse)
async def create_checkout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout session for upgrading to Pro."""
    if current_user.plan == "pro":
        from app.core.exceptions import BadRequestException

        raise BadRequestException("You are already on the Pro plan")

    checkout_url = await stripe_service.create_checkout_session(
        db=db,
        user=current_user,
        success_url=f"{settings.FRONTEND_URL}/settings?upgrade=success",
        cancel_url=f"{settings.FRONTEND_URL}/settings?upgrade=cancelled",
    )

    return CheckoutResponse(checkout_url=checkout_url)


@router.post("/create-portal-session", response_model=PortalResponse)
async def create_portal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session for managing subscription."""
    portal_url = await stripe_service.create_portal_session(
        db=db,
        user=current_user,
        return_url=f"{settings.FRONTEND_URL}/settings",
    )

    return PortalResponse(portal_url=portal_url)


@router.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.

    This endpoint is called by Stripe when subscription events occur.
    It verifies the webhook signature and processes the event.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Verify webhook signature
    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            logger.warning("stripe_webhook_invalid_payload")
            return JSONResponse(status_code=400, content={"error": "Invalid payload"})
        except stripe.SignatureVerificationError:
            logger.warning("stripe_webhook_invalid_signature")
            return JSONResponse(status_code=400, content={"error": "Invalid signature"})
    else:
        # In development without webhook secret, parse directly
        import json

        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    # Process the event
    async with async_session_factory() as db:
        try:
            await stripe_service.handle_webhook_event(db, event)
            await db.commit()
        except Exception as e:
            logger.error("stripe_webhook_processing_failed", error=str(e))
            await db.rollback()

    return JSONResponse(status_code=200, content={"received": True})
