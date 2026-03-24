# backend/app/routers/settings.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.encryption import decrypt_value, encrypt_value
from app.models.user import User
from app.schemas.settings import (
    APIKeyStatus,
    APIKeyStatusResponse,
    UpdateAPIKeyRequest,
)

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/api-keys", response_model=APIKeyStatusResponse)
async def get_api_key_status(
    current_user: User = Depends(get_current_user),
):
    """
    Check which API keys are configured.

    Returns masked key values (e.g., sk-...abc) — never the full key.
    """
    openai_status = APIKeyStatus(is_set=False, masked_key=None)

    if current_user.encrypted_openai_key:
        try:
            full_key = decrypt_value(current_user.encrypted_openai_key)
            masked = _mask_key(full_key)
            openai_status = APIKeyStatus(is_set=True, masked_key=masked)
        except ValueError:
            openai_status = APIKeyStatus(is_set=True, masked_key="(decryption failed)")

    return APIKeyStatusResponse(openai=openai_status)


@router.put("/api-keys/openai", response_model=APIKeyStatusResponse)
async def update_openai_key(
    data: UpdateAPIKeyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Store or update the user's OpenAI API key.

    The key is encrypted before storage. The full key is never
    returned in any API response.
    """
    # Basic validation
    key = data.openai_api_key.strip()
    if not key.startswith("sk-"):
        from app.core.exceptions import BadRequestException

        raise BadRequestException(
            "Invalid OpenAI API key format. Key should start with 'sk-'"
        )

    # Encrypt and store
    current_user.encrypted_openai_key = encrypt_value(key)
    await db.flush()

    masked = _mask_key(key)
    return APIKeyStatusResponse(
        openai=APIKeyStatus(is_set=True, masked_key=masked),
    )


@router.delete("/api-keys/openai", response_model=APIKeyStatusResponse)
async def delete_openai_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the user's stored OpenAI API key."""
    current_user.encrypted_openai_key = None
    await db.flush()

    return APIKeyStatusResponse(
        openai=APIKeyStatus(is_set=False, masked_key=None),
    )


def _mask_key(key: str) -> str:
    """Mask an API key for display: sk-proj-abc...xyz"""
    if len(key) <= 8:
        return "sk-***"
    return f"{key[:7]}...{key[-4:]}"
