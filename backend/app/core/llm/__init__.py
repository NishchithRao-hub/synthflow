# backend/app/core/llm/__init__.py

from app.core.llm.base import LLMConfig, LLMProvider, LLMResponse
from app.core.llm.ollama_provider import OllamaProvider
from app.core.llm.openai_provider import OpenAIProvider

PROVIDER_MAP: dict[str, type[LLMProvider]] = {
    "ollama": OllamaProvider,
    "openai": OpenAIProvider,
}


def get_provider(model_string: str) -> tuple[LLMProvider, str]:
    """
    Parse a model string like 'ollama/phi3:mini' or 'openai/gpt-4o-mini'
    and return the appropriate provider instance and model name.

    Returns:
        (provider_instance, model_name)
    """
    if "/" not in model_string:
        raise ValueError(
            f"Invalid model string: '{model_string}'. "
            f"Expected format: 'provider/model' (e.g., 'ollama/phi3:mini')"
        )

    provider_name, model_name = model_string.split("/", 1)

    provider_class = PROVIDER_MAP.get(provider_name)
    if provider_class is None:
        available = ", ".join(PROVIDER_MAP.keys())
        raise ValueError(
            f"Unknown LLM provider: '{provider_name}'. Available: {available}"
        )

    return provider_class(), model_name


__all__ = [
    "LLMProvider",
    "LLMConfig",
    "LLMResponse",
    "OllamaProvider",
    "OpenAIProvider",
    "get_provider",
]
