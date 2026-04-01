# backend/app/services/stripe_service.py

import stripe
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.models.user import User

logger = structlog.get_logger()

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Price ID for the Pro plan — you'll create this in Stripe Dashboard
# For now we'll create it programmatically on first use
PRO_PLAN_PRICE_ID: str | None = None


async def get_or_create_pro_price() -> str:
    """
    Get or create the Stripe Price for the Pro plan.

    In test mode, this creates the Product and Price automatically.
    In production, you'd hardcode the Price ID from your Stripe Dashboard.
    """
    global PRO_PLAN_PRICE_ID

    if PRO_PLAN_PRICE_ID:
        return PRO_PLAN_PRICE_ID

    try:
        # Search for existing product
        products = stripe.Product.search(
            query="name:'SynthFlow Pro'",
            limit=1,
        )

        if products.data:
            product = products.data[0]
            # Get the price for this product
            prices = stripe.Price.list(product=product.id, active=True, limit=1)
            if prices.data:
                PRO_PLAN_PRICE_ID = prices.data[0].id
                return PRO_PLAN_PRICE_ID

        # Create product and price
        product = stripe.Product.create(
            name="SynthFlow Pro",
            description="Unlimited workflows, 5000 runs/month, 2000 AI calls/month",
        )

        price = stripe.Price.create(
            product=product.id,
            unit_amount=1000,  # $10.00
            currency="usd",
            recurring={"interval": "month"},
        )

        PRO_PLAN_PRICE_ID = price.id
        logger.info("stripe_pro_price_created", price_id=price.id)
        return PRO_PLAN_PRICE_ID

    except stripe.StripeError as e:
        logger.error("stripe_price_creation_failed", error=str(e))
        raise BadRequestException(f"Stripe configuration error: {str(e)}")


async def get_or_create_customer(db: AsyncSession, user: User) -> str:
    """
    Get or create a Stripe Customer for the user.

    Stores the customer ID on the user record for future lookups.
    """
    if user.stripe_customer_id:
        return user.stripe_customer_id

    try:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name,
            metadata={"synthflow_user_id": user.id},
        )

        user.stripe_customer_id = customer.id
        await db.flush()

        logger.info(
            "stripe_customer_created",
            user_id=user.id,
            customer_id=customer.id,
        )

        return customer.id

    except stripe.StripeError as e:
        logger.error("stripe_customer_creation_failed", error=str(e))
        raise BadRequestException(f"Failed to create Stripe customer: {str(e)}")


async def create_checkout_session(
    db: AsyncSession, user: User, success_url: str, cancel_url: str
) -> str:
    """
    Create a Stripe Checkout Session for upgrading to Pro.

    Returns the checkout URL to redirect the user to.
    """
    customer_id = await get_or_create_customer(db, user)
    price_id = await get_or_create_pro_price()

    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"synthflow_user_id": user.id},
        )

        logger.info(
            "stripe_checkout_created",
            user_id=user.id,
            session_id=session.id,
        )

        if not session.url:
            raise BadRequestException("Stripe returned no checkout URL")
        return session.url

    except stripe.StripeError as e:
        logger.error("stripe_checkout_failed", error=str(e))
        raise BadRequestException(f"Failed to create checkout session: {str(e)}")


async def create_portal_session(db: AsyncSession, user: User, return_url: str) -> str:
    """
    Create a Stripe Customer Portal session for managing subscriptions.

    Returns the portal URL to redirect the user to.
    """
    customer_id = await get_or_create_customer(db, user)

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )

        if not session.url:
            raise BadRequestException("Stripe returned no portal URL")
        return session.url

    except stripe.StripeError as e:
        logger.error("stripe_portal_failed", error=str(e))
        raise BadRequestException(f"Failed to create portal session: {str(e)}")


async def handle_webhook_event(db: AsyncSession, event: dict) -> None:
    """
    Process a Stripe webhook event.

    Handles subscription lifecycle events to update user plan status.
    """
    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    logger.info("stripe_webhook_received", event_type=event_type)

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)

    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(db, data)

    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)

    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, data)


async def _handle_checkout_completed(db: AsyncSession, session: dict) -> None:
    """Handle successful checkout — upgrade user to Pro."""
    customer_id = session.get("customer")
    if not customer_id:
        return

    user = await _find_user_by_customer_id(db, customer_id)
    if not user:
        logger.warning("stripe_user_not_found", customer_id=customer_id)
        return

    user.plan = "pro"
    await db.flush()

    logger.info(
        "user_upgraded_to_pro",
        user_id=user.id,
        customer_id=customer_id,
    )


async def _handle_subscription_updated(db: AsyncSession, subscription: dict) -> None:
    """Handle subscription changes (e.g., plan changes, renewals)."""
    customer_id = subscription.get("customer")
    status = subscription.get("status")

    if not customer_id:
        return

    user = await _find_user_by_customer_id(db, customer_id)
    if not user:
        return

    if status == "active":
        user.plan = "pro"
    elif status in ("past_due", "unpaid"):
        # Keep pro for now but could add grace period logic
        logger.warning("subscription_past_due", user_id=user.id)
    elif status in ("canceled", "incomplete_expired"):
        user.plan = "free"

    await db.flush()

    logger.info(
        "subscription_updated",
        user_id=user.id,
        status=status,
        plan=user.plan,
    )


async def _handle_subscription_deleted(db: AsyncSession, subscription: dict) -> None:
    """Handle subscription cancellation — downgrade to free."""
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    user = await _find_user_by_customer_id(db, customer_id)
    if not user:
        return

    user.plan = "free"
    await db.flush()

    logger.info("user_downgraded_to_free", user_id=user.id)


async def _handle_payment_failed(db: AsyncSession, invoice: dict) -> None:
    """Handle failed payment — log warning."""
    customer_id = invoice.get("customer")
    logger.warning(
        "payment_failed",
        customer_id=customer_id,
        amount=invoice.get("amount_due"),
    )


async def _find_user_by_customer_id(db: AsyncSession, customer_id: str) -> User | None:
    """Find a user by their Stripe customer ID."""
    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    return result.scalar_one_or_none()
