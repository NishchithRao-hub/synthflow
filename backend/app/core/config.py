from __future__ import annotations

from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parent.parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "SynthFlow"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    JWT_SECRET_KEY: str = "dev-only-change-this-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # AWS
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "synthflow-artifacts"

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Email / SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "SynthFlow"
    SMTP_FROM_EMAIL: str = "noreply@synthflow.io"
    SMTP_STARTTLS: bool = True
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_EXPIRE_HOURS: int = 1

    # URLs
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    @model_validator(mode="after")
    def validate_production_security(self) -> Settings:
        if not self.DATABASE_URL.strip():
            raise ValueError("DATABASE_URL must be set")

        env = self.ENVIRONMENT.lower().strip()
        is_production = env in {"production", "prod"}

        if is_production and self.DEBUG:
            raise ValueError("DEBUG must be false in production")

        if is_production and (
            not self.JWT_SECRET_KEY
            or self.JWT_SECRET_KEY
            in {"change-me-in-production", "dev-only-change-this-secret"}
        ):
            raise ValueError("Set a strong JWT_SECRET_KEY in production")

        return self


settings = Settings()
