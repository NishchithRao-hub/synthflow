# backend/app/schemas/auth.py

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

# --- Request schemas ---


class GoogleAuthRequest(BaseModel):
    credential: str = Field(description="Google ID token from frontend Sign-In")

    model_config = {
        "json_schema_extra": {"example": {"credential": "eyJhbGciOiJSUzI1NiIs..."}}
    }


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100, description="Full display name")
    email: EmailStr
    password: str = Field(
        min_length=8, max_length=72, description="Password (8–72 chars)"
    )

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name must not be blank")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes in UTF-8")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Jane Doe",
                "email": "jane@example.com",
                "password": "MyP@ssw0rd",
            }
        }
    }


class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = {
        "json_schema_extra": {
            "example": {"email": "jane@example.com", "password": "MyP@ssw0rd"}
        }
    }


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes in UTF-8")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


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
    is_email_verified: bool
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


class MessageResponse(BaseModel):
    message: str
