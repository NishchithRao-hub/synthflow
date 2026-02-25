# backend/app/schemas/auth.py

from datetime import datetime

from pydantic import BaseModel, Field

# --- Request schemas ---


class GoogleAuthRequest(BaseModel):
    credential: str = Field(description="Google ID token from frontend Sign-In")

    model_config = {
        "json_schema_extra": {"example": {"credential": "eyJhbGciOiJSUzI1NiIs..."}}
    }


class RefreshTokenRequest(BaseModel):
    refresh_token: str

    model_config = {
        "json_schema_extra": {"example": {"refresh_token": "eyJhbGciOiJIUzI1NiIs..."}}
    }


# --- Response schemas ---


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str | None
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token expiry in seconds")
    user: UserResponse


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LogoutRequest(BaseModel):
    refresh_token: str
