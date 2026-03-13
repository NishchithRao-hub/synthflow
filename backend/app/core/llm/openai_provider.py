# backend/app/core/llm/openai_provider.py

import httpx
import structlog

from app.core.llm.base import LLMConfig, LLMProvider, LLMResponse

logger = structlog.get_logger()

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIProvider(LLMProvider):
    """
    LLM provider for OpenAI (BYOK — Bring Your Own Key).

    Users store their own API key in their account settings.
    The key is passed via LLMConfig.api_key at execution time.
    """

    @property
    def provider_name(self) -> str:
        return "openai"

    async def complete(self, prompt: str, config: LLMConfig) -> LLMResponse:
        if not config.api_key:
            raise RuntimeError(
                "OpenAI requires an API key. Add your key in Settings > API Keys."
            )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config.api_key}",
        }

        payload = {
            "model": config.model,
            "messages": [
                {"role": "user", "content": prompt},
            ],
            "temperature": config.temperature,
        }

        if config.max_tokens:
            payload["max_tokens"] = config.max_tokens

        logger.info(
            "openai_request",
            model=config.model,
            prompt_length=len(prompt),
            timeout=config.timeout,
        )

        async with httpx.AsyncClient(timeout=config.timeout) as client:
            response = await client.post(
                OPENAI_API_URL,
                headers=headers,
                json=payload,
            )

            if response.status_code == 401:
                raise RuntimeError(
                    "OpenAI API key is invalid or expired. "
                    "Please update your key in Settings > API Keys."
                )

            if response.status_code == 429:
                raise RuntimeError(
                    "OpenAI rate limit exceeded. Please wait and try again."
                )

            if response.status_code != 200:
                error_body = response.text[:500]
                raise RuntimeError(
                    f"OpenAI returned status {response.status_code}: {error_body}"
                )

            data = response.json()

            # Extract response text
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("OpenAI returned empty response (no choices)")

            response_text = choices[0].get("message", {}).get("content", "")

            # Extract usage
            usage_data = data.get("usage", {})

            logger.info(
                "openai_response",
                model=config.model,
                response_length=len(response_text),
                prompt_tokens=usage_data.get("prompt_tokens"),
                completion_tokens=usage_data.get("completion_tokens"),
            )

            return LLMResponse(
                text=response_text,
                model=config.model,
                provider=self.provider_name,
                usage={
                    "prompt_tokens": usage_data.get("prompt_tokens"),
                    "completion_tokens": usage_data.get("completion_tokens"),
                    "total_tokens": usage_data.get("total_tokens"),
                },
                raw=data,
            )

    async def is_available(self, config: LLMConfig) -> bool:
        """
        Check if OpenAI is reachable and the API key is valid.

        Makes a minimal request to verify credentials.
        """
        if not config.api_key:
            return False

        try:
            headers = {
                "Authorization": f"Bearer {config.api_key}",
            }

            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers=headers,
                )
                return response.status_code == 200

        except Exception:
            return False
