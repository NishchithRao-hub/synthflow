# backend/app/services/auth_service.py

from datetime import datetime, timedelta, timezone

import httpx
import structlog
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.models.refresh_token import RefreshToken
from app.models.user import User

logger = structlog.get_logger()

# Google's token info endpoint
GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"


async def verify_google_token(credential: str) -> dict:
    """
    Verify a Google ID token by calling Google's tokeninfo endpoint.

    Returns the decoded token payload with user info.
    Raises BadRequestException if token is invalid.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            GOOGLE_TOKEN_INFO_URL,
            params={"id_token": credential},
        )

    if response.status_code != 200:
        logger.warning("google_token_invalid", status=response.status_code)
        raise BadRequestException("Invalid Google credential")

    payload = response.json()

    # Verify the token was issued for our app
    if payload.get("aud") != settings.GOOGLE_CLIENT_ID:
        logger.warning(
            "google_token_wrong_audience",
            expected=settings.GOOGLE_CLIENT_ID,
            received=payload.get("aud"),
        )
        raise BadRequestException("Google token was not issued for this application")

    # Verify email is present and verified
    if not payload.get("email_verified", False):
        raise BadRequestException("Google email not verified")

    return payload


async def get_or_create_user(
    db: AsyncSession, google_payload: dict
) -> tuple[User, bool]:
    """
    Find existing user by OAuth ID, or create a new one.

    Returns (user, is_new_user).
    """
    oauth_id = google_payload["sub"]

    # Try to find existing user
    query = select(User).where(User.oauth_id == oauth_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is not None:
        # Update profile info in case it changed on Google's side
        user.name = google_payload.get("name", user.name)
        user.avatar_url = google_payload.get("picture", user.avatar_url)
        await db.flush()
        return user, False

    # Create new user
    user = User(
        email=google_payload["email"],
        name=google_payload.get("name", ""),
        avatar_url=google_payload.get("picture"),
        oauth_provider="google",
        oauth_id=oauth_id,
        plan="free",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    logger.info("user_created", user_id=user.id, email=user.email)
    return user, True


async def store_refresh_token(
    db: AsyncSession, user_id: str, token: str
) -> RefreshToken:
    """Store a refresh token in the database for later validation and revocation."""
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    refresh_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
    )
    db.add(refresh_token)
    await db.flush()
    return refresh_token


async def authenticate_with_google(
    db: AsyncSession, credential: str
) -> tuple[User, str, str]:
    """
    Full Google authentication flow.

    1. Verify Google ID token
    2. Get or create user
    3. Generate JWT access + refresh tokens
    4. Store refresh token in database

    Returns (user, access_token, refresh_token).
    """
    # Step 1: Verify with Google
    google_payload = await verify_google_token(credential)

    # Step 2: Get or create user
    user, is_new = await get_or_create_user(db, google_payload)

    # Step 3: Generate tokens
    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)

    # Step 4: Store refresh token
    await store_refresh_token(db, user.id, refresh_token)

    logger.info(
        "user_authenticated",
        user_id=user.id,
        is_new_user=is_new,
        method="google",
    )
    return user, access_token, refresh_token


async def refresh_access_token(
    db: AsyncSession, refresh_token_str: str
) -> tuple[User, str]:
    """
    Validate a refresh token and issue a new access token.

    Returns (user, new_access_token).
    Raises exception if token is invalid, revoked, or expired.
    """
    # Step 1: Decode the JWT
    try:
        payload = verify_refresh_token(refresh_token_str)
    except JWTError:
        raise BadRequestException("Invalid or expired refresh token")

    user_id = payload["sub"]

    # Step 2: Check token exists in database and is not revoked
    query = select(RefreshToken).where(
        RefreshToken.token == refresh_token_str,
        RefreshToken.is_revoked.is_(False),
    )
    result = await db.execute(query)
    stored_token = result.scalar_one_or_none()

    if stored_token is None:
        raise BadRequestException("Refresh token not found or has been revoked")

    # Step 3: Check expiry
    if stored_token.expires_at < datetime.now(timezone.utc):
        raise BadRequestException("Refresh token has expired")

    # Step 4: Fetch user
    user_query = select(User).where(User.id == user_id)
    result = await db.execute(user_query)
    user = result.scalar_one_or_none()

    if user is None:
        raise BadRequestException("User not found")

    # Step 5: Issue new access token
    new_access_token = create_access_token(user.id, user.email)

    logger.info("token_refreshed", user_id=user.id)
    return user, new_access_token


async def revoke_refresh_token(db: AsyncSession, refresh_token_str: str) -> None:
    """
    Revoke a refresh token (logout).

    Silently succeeds even if token is not found (idempotent).
    """
    query = select(RefreshToken).where(RefreshToken.token == refresh_token_str)
    result = await db.execute(query)
    stored_token = result.scalar_one_or_none()

    if stored_token is not None:
        stored_token.is_revoked = True
        await db.flush()
        logger.info("token_revoked", user_id=stored_token.user_id)
