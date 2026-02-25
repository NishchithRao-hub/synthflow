# backend/app/core/auth.py

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings

# Token types
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def create_access_token(user_id: str, email: str) -> str:
    """Create a short-lived access token."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "email": email,
        "type": ACCESS_TOKEN_TYPE,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": user_id,
        "type": REFRESH_TOKEN_TYPE,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.

    Returns the payload dict if valid.
    Raises JWTError if invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        raise


def verify_access_token(token: str) -> dict:
    """
    Decode an access token and verify it is the correct type.

    Returns the payload with 'sub' (user_id) and 'email'.
    Raises JWTError if invalid, expired, or wrong token type.
    """
    payload = decode_token(token)
    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise JWTError("Invalid token type: expected access token")
    if "sub" not in payload:
        raise JWTError("Token missing subject claim")
    return payload


def verify_refresh_token(token: str) -> dict:
    """
    Decode a refresh token and verify it is the correct type.

    Returns the payload with 'sub' (user_id).
    Raises JWTError if invalid, expired, or wrong token type.
    """
    payload = decode_token(token)
    if payload.get("type") != REFRESH_TOKEN_TYPE:
        raise JWTError("Invalid token type: expected refresh token")
    if "sub" not in payload:
        raise JWTError("Token missing subject claim")
    return payload
