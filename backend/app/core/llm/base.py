# backend/app/core/llm/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class LLMConfig:
    """Configuration for an LLM request."""

    model: str
    timeout: int = 180  # seconds
    temperature: float = 0.7
    max_tokens: int | None = None
    api_key: str | None = None  # For BYOK providers


@dataclass
class LLMResponse:
    """Standardized response from any LLM provider."""

    text: str
    model: str
    provider: str
    usage: dict = field(default_factory=dict)  # token counts if available
    raw: dict = field(default_factory=dict)  # full provider response for debugging


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.

    Each provider (Ollama, OpenAI, etc.) implements the complete() method
    which takes a prompt and config, and returns a standardized LLMResponse.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """The name of this provider (e.g., 'ollama', 'openai')."""
        pass

    @abstractmethod
    async def complete(self, prompt: str, config: LLMConfig) -> LLMResponse:
        """
        Send a prompt to the LLM and return the response.

        Args:
            prompt: The fully resolved prompt text
            config: LLM configuration (model, timeout, etc.)

        Returns:
            LLMResponse with the generated text

        Raises:
            RuntimeError if the request fails
        """
        pass

    @abstractmethod
    async def is_available(self, config: LLMConfig) -> bool:
        """
        Check if this provider is available and configured correctly.

        Returns True if the provider can accept requests.
        """
        pass
