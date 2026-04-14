# backend/app/services/auth_service.py

import secrets
from datetime import datetime, timedelta, timezone

import httpx
import structlog
from jose import JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.core.config import settings
from app.core.email_validation import normalize_email, validate_email_for_registration
from app.core.exceptions import BadRequestException
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.services import email_service

logger = structlog.get_logger()

# Google's token info endpoint
GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"

# bcrypt context — auto-selects cost factor
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return _pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd_ctx.verify(plain, hashed)
    except (ValueError, TypeError) as exc:
        logger.warning("invalid_password_hash", error=str(exc))
        return False


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------


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

    if payload.get("aud") != settings.GOOGLE_CLIENT_ID:
        logger.warning(
            "google_token_wrong_audience",
            expected=settings.GOOGLE_CLIENT_ID,
            received=payload.get("aud"),
        )
        raise BadRequestException("Google token was not issued for this application")

    if not payload.get("email_verified", False):
        raise BadRequestException("Google email not verified")

    return payload


async def get_or_create_google_user(
    db: AsyncSession, google_payload: dict
) -> tuple[User, bool]:
    """
    Find existing user by OAuth ID (or email), or create a new one.
    Returns (user, is_new_user).
    """
    oauth_id = google_payload["sub"]

    # Try by oauth_id first
    query = select(User).where(User.oauth_id == oauth_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is not None:
        user.name = google_payload.get("name", user.name)
        user.avatar_url = google_payload.get("picture", user.avatar_url)
        await db.flush()
        return user, False

    # Also check if a password user already exists with the same email
    email = google_payload["email"].lower()
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing is not None:
        # Link the Google account to the existing email/password account
        existing.oauth_id = oauth_id
        existing.oauth_provider = "google"
        existing.avatar_url = google_payload.get("picture", existing.avatar_url)
        existing.is_email_verified = True
        await db.flush()
        return existing, False

    # Create brand-new user
    user = User(
        email=email,
        name=google_payload.get("name", ""),
        avatar_url=google_payload.get("picture"),
        oauth_provider="google",
        oauth_id=oauth_id,
        plan="free",
        is_email_verified=True,
        normalized_email=normalize_email(email),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    logger.info("user_created_google", user_id=user.id, email=user.email)
    return user, True


async def authenticate_with_google(
    db: AsyncSession, credential: str
) -> tuple[User, str, str]:
    """Full Google authentication flow. Returns (user, access_token, refresh_token)."""
    google_payload = await verify_google_token(credential)
    user, is_new = await get_or_create_google_user(db, google_payload)
    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)
    await store_refresh_token(db, user.id, refresh_token)
    logger.info(
        "user_authenticated", user_id=user.id, is_new_user=is_new, method="google"
    )
    return user, access_token, refresh_token


# ---------------------------------------------------------------------------
# Email / password registration & login
# ---------------------------------------------------------------------------


async def register_user(db: AsyncSession, name: str, email: str, password: str) -> User:
    """
    Register a new user with email + password.

    1. Validate email (disposable check, MX record).
    2. Check normalized email for alias-based duplicate accounts.
    3. Hash password and create user.
    4. Send email verification link.
    """
    email = email.strip().lower()

    # Anti-abuse: disposable domains & MX check
    ok, err = await validate_email_for_registration(email)
    if not ok:
        raise BadRequestException(err)

    normalized = normalize_email(email)

    # Check for exact email duplicate
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise BadRequestException("An account with this email already exists.")

    # Check for alias-based duplicate (e.g. test+1@gmail.com vs test@gmail.com)
    result = await db.execute(select(User).where(User.normalized_email == normalized))
    if result.scalar_one_or_none() is not None:
        raise BadRequestException(
            "An account already exists for this email address (alias detected)."
        )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
    )

    user = User(
        email=email,
        name=name.strip(),
        oauth_provider=None,
        oauth_id=None,
        password_hash=hash_password(password),
        is_email_verified=False,
        email_verification_token=token,
        email_verification_expires_at=expires_at,
        normalized_email=normalized,
        plan="free",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Fire-and-forget — don't block registration on email delivery
    await email_service.send_verification_email(user.email, user.name, token)

    logger.info("user_registered", user_id=user.id, email=user.email)
    return user


async def verify_email_token(db: AsyncSession, token: str) -> User:
    """
    Consume an email-verification token.  Raises BadRequestException on failure.
    """
    result = await db.execute(
        select(User).where(User.email_verification_token == token)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise BadRequestException("Invalid or expired verification link.")

    if user.is_email_verified:
        # Idempotent — already verified
        return user

    if (
        user.email_verification_expires_at
        and user.email_verification_expires_at < datetime.now(timezone.utc)
    ):
        raise BadRequestException(
            "Verification link has expired. Please request a new one."
        )

    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    await db.flush()

    logger.info("email_verified", user_id=user.id)
    return user


async def resend_verification_email(db: AsyncSession, email: str) -> None:
    """
    Re-issue an email-verification token and resend the email.
    Silently no-ops if user is already verified or doesn't exist
    (to avoid user enumeration).
    """
    result = await db.execute(select(User).where(User.email == email.strip().lower()))
    user = result.scalar_one_or_none()

    if user is None or user.is_email_verified:
        return

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
    )
    user.email_verification_token = token
    user.email_verification_expires_at = expires_at
    await db.flush()

    await email_service.send_verification_email(user.email, user.name, token)
    logger.info("verification_email_resent", user_id=user.id)


async def authenticate_with_email(
    db: AsyncSession, email: str, password: str
) -> tuple[User, str, str]:
    """
    Verify email + password and issue JWT tokens.
    Returns (user, access_token, refresh_token).
    """
    email = email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Constant-time-safe: always verify even when user is None to prevent timing attacks
    dummy_hash = "$2b$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    stored_hash = user.password_hash if (user and user.password_hash) else dummy_hash

    if (
        not verify_password(password, stored_hash)
        or user is None
        or not user.password_hash
    ):
        raise BadRequestException("Incorrect email or password.")

    if not user.is_email_verified:
        raise BadRequestException(
            "Please verify your email address before signing in. "
            "Check your inbox for the verification link."
        )

    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)
    await store_refresh_token(db, user.id, refresh_token)

    logger.info("user_authenticated", user_id=user.id, method="email")
    return user, access_token, refresh_token


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


async def request_password_reset(db: AsyncSession, email: str) -> None:
    """
    Generate a password-reset token and email it.
    Always returns without error even if email is unknown (prevents enumeration).
    """
    result = await db.execute(select(User).where(User.email == email.strip().lower()))
    user = result.scalar_one_or_none()

    if user is None or not user.password_hash:
        # No account or Google-only account — silently ignore
        return

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=settings.PASSWORD_RESET_EXPIRE_HOURS
    )
    user.password_reset_token = token
    user.password_reset_expires_at = expires_at
    await db.flush()

    await email_service.send_password_reset_email(user.email, user.name, token)
    logger.info("password_reset_requested", user_id=user.id)


async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    """
    Consume a password-reset token and update the password.
    Raises BadRequestException on invalid/expired token.
    """
    result = await db.execute(select(User).where(User.password_reset_token == token))
    user = result.scalar_one_or_none()

    if user is None:
        raise BadRequestException("Invalid or expired password reset link.")

    if user.password_reset_expires_at and user.password_reset_expires_at < datetime.now(
        timezone.utc
    ):
        raise BadRequestException(
            "Password reset link has expired. Please request a new one."
        )

    user.password_hash = hash_password(new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    await db.flush()

    logger.info("password_reset_completed", user_id=user.id)


# ---------------------------------------------------------------------------
# Shared token helpers (used by both auth paths)
# ---------------------------------------------------------------------------


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


async def refresh_access_token(
    db: AsyncSession, refresh_token_str: str
) -> tuple[User, str]:
    """Validate a refresh token and issue a new access token."""
    try:
        payload = verify_refresh_token(refresh_token_str)
    except JWTError:
        raise BadRequestException("Invalid or expired refresh token")

    user_id = payload["sub"]

    query = select(RefreshToken).where(
        RefreshToken.token == refresh_token_str,
        RefreshToken.is_revoked.is_(False),
    )
    result = await db.execute(query)
    stored_token = result.scalar_one_or_none()

    if stored_token is None:
        raise BadRequestException("Refresh token not found or has been revoked")

    if stored_token.expires_at < datetime.now(timezone.utc):
        raise BadRequestException("Refresh token has expired")

    user_query = select(User).where(User.id == user_id)
    result = await db.execute(user_query)
    user = result.scalar_one_or_none()

    if user is None:
        raise BadRequestException("User not found")

    new_access_token = create_access_token(user.id, user.email)
    logger.info("token_refreshed", user_id=user.id)
    return user, new_access_token


async def revoke_refresh_token(db: AsyncSession, refresh_token_str: str) -> None:
    """Revoke a refresh token (logout). Idempotent."""
    query = select(RefreshToken).where(RefreshToken.token == refresh_token_str)
    result = await db.execute(query)
    stored_token = result.scalar_one_or_none()

    if stored_token is not None:
        stored_token.is_revoked = True
        await db.flush()
        logger.info("token_revoked", user_id=stored_token.user_id)


async def delete_user_account(db: AsyncSession, user: User) -> None:
    """
    Permanently delete a user account.

    Related rows are removed by DB/ORM cascades (workflows, runs, logs,
    refresh tokens, usage records).
    """
    user_id = user.id
    email = user.email
    await db.delete(user)
    await db.flush()
    logger.info("user_deleted", user_id=user_id, email=email)
