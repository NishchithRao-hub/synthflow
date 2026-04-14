# backend/app/routers/auth.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    EmailLoginRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LogoutRequest,
    MessageResponse,
    RefreshResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------


@router.post("/google", response_model=AuthResponse)
async def google_login(
    data: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with Google OAuth. Exchange a Google ID token for JWT tokens."""
    user, access_token, refresh_token = await auth_service.authenticate_with_google(
        db, data.credential
    )
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Email / password registration & login
# ---------------------------------------------------------------------------


@router.post("/register", response_model=MessageResponse, status_code=201)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new account with email and password.

    Sends a verification email — the account cannot log in until verified.
    """
    await auth_service.register_user(db, data.name, str(data.email), data.password)
    return MessageResponse(
        message="Account created. Please check your inbox to verify your email address."
    )


@router.post("/login", response_model=AuthResponse)
async def email_login(
    data: EmailLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with email and password."""
    user, access_token, refresh_token = await auth_service.authenticate_with_email(
        db, str(data.email), data.password
    )
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify an email address using the token sent during registration."""
    await auth_service.verify_email_token(db, data.token)
    return MessageResponse(message="Email verified successfully. You can now sign in.")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Resend the email verification link.
    Always returns 200 regardless of whether the email exists (prevents enumeration).
    """
    await auth_service.resend_verification_email(db, str(data.email))
    return MessageResponse(
        message="If that address is registered and unverified, a new link has been sent."
    )


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password-reset email.
    Always returns 200 to prevent user enumeration.
    """
    await auth_service.request_password_reset(db, str(data.email))
    return MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset a password using the token from the reset email."""
    await auth_service.reset_password(db, data.token, data.new_password)
    return MessageResponse(
        message="Password updated successfully. You can now sign in."
    )


# ---------------------------------------------------------------------------
# Token management
# ---------------------------------------------------------------------------


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new access token."""
    user, new_access_token = await auth_service.refresh_access_token(
        db, data.refresh_token
    )
    return RefreshResponse(
        access_token=new_access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=204)
async def logout(
    data: LogoutRequest,
    db: AsyncSession = Depends(get_db),
):
    """Revoke a refresh token. Idempotent."""
    await auth_service.revoke_refresh_token(db, data.refresh_token)
    return None


# ---------------------------------------------------------------------------
# Current user
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.delete("/me", response_model=MessageResponse)
async def delete_current_user_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the current user's account and related data."""
    await auth_service.delete_user_account(db, current_user)
    return MessageResponse(message="Your account has been deleted.")
