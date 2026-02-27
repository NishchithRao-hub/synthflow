# backend/app/core/dependencies.py

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_access_token
from app.core.database import get_db
from app.core.exceptions import SynthFlowException
from app.models.user import User

# HTTPBearer extracts the token from the "Authorization: Bearer <token>" header
security = HTTPBearer()


class UnauthorizedException(SynthFlowException):
    def __init__(self, message: str = "Invalid or expired access token"):
        super().__init__(message=message, status_code=401)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency that:
    1. Extracts the Bearer token from the Authorization header
    2. Decodes and validates the JWT
    3. Fetches the user from the database
    4. Returns the User object

    Raises 401 if token is missing, invalid, expired, or user not found.
    """
    token = credentials.credentials

    # Step 1: Decode and validate JWT
    try:
        payload = verify_access_token(token)
    except JWTError:
        raise UnauthorizedException()

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Token missing user identifier")

    # Step 2: Fetch user from database
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException("User not found")

    return user
