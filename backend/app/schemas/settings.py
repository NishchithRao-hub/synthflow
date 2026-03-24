# backend/app/schemas/settings.py

from pydantic import BaseModel, Field


class UpdateAPIKeyRequest(BaseModel):
    openai_api_key: str = Field(
        min_length=1,
        description="Your OpenAI API key (starts with sk-)",
    )

    model_config = {
        "json_schema_extra": {"example": {"openai_api_key": "sk-proj-abc123..."}}
    }


class DeleteAPIKeyRequest(BaseModel):
    provider: str = Field(description="Provider name: 'openai'")


class APIKeyStatus(BaseModel):
    is_set: bool
    masked_key: str | None = None


class APIKeyStatusResponse(BaseModel):
    openai: APIKeyStatus
