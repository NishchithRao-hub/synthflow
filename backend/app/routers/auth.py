# backend/app/routers/auth.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    GoogleAuthRequest,
    LogoutRequest,
    RefreshResponse,
    RefreshTokenRequest,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


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
    """Revoke a refresh token. Idempotent — succeeds even if token is already revoked."""
    await auth_service.revoke_refresh_token(db, data.refresh_token)
    return None


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)
