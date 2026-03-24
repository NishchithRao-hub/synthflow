# backend/app/core/llm/ollama_provider.py

import httpx
import structlog

from app.core.config import settings
from app.core.llm.base import LLMConfig, LLMProvider, LLMResponse

logger = structlog.get_logger()


class OllamaProvider(LLMProvider):
    """
    LLM provider for Ollama (local models).

    Ollama runs locally and serves models via a REST API.
    No API key required. Free and private.
    """

    @property
    def provider_name(self) -> str:
        return "ollama"

    async def complete(self, prompt: str, config: LLMConfig) -> LLMResponse:
        url = f"{settings.OLLAMA_BASE_URL}/api/generate"

        payload = {
            "model": config.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": config.temperature,
            },
        }

        if config.max_tokens:
            payload["options"]["num_predict"] = config.max_tokens

        logger.info(
            "ollama_request",
            model=config.model,
            prompt_length=len(prompt),
            timeout=config.timeout,
        )

        async with httpx.AsyncClient(timeout=config.timeout) as client:
            response = await client.post(url, json=payload)

            if response.status_code != 200:
                raise RuntimeError(
                    f"Ollama returned status {response.status_code}: {response.text}"
                )

            data = response.json()
            response_text = data.get("response", "")

            logger.info(
                "ollama_response",
                model=config.model,
                response_length=len(response_text),
                eval_count=data.get("eval_count"),
                eval_duration_ns=data.get("eval_duration"),
            )

            return LLMResponse(
                text=response_text,
                model=config.model,
                provider=self.provider_name,
                usage={
                    "eval_count": data.get("eval_count"),
                    "prompt_eval_count": data.get("prompt_eval_count"),
                },
                raw=data,
            )

    async def is_available(self, config: LLMConfig) -> bool:
        """Check if Ollama is running and the model is available."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                if response.status_code != 200:
                    return False

                data = response.json()
                available_models = [
                    m.get("name", "").split(":")[0] for m in data.get("models", [])
                ]
                return config.model in available_models

        except Exception:
            return False
