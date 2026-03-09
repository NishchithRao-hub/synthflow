# backend/app/core/executors/ai_executor.py

import json

import httpx
import structlog

from app.core.config import settings
from app.core.execution_context import ExecutionContext, NodeResult
from app.core.executors.base import NodeExecutor

logger = structlog.get_logger()


class AIExecutor(NodeExecutor):
    """
    Executor for AI task nodes.

    Sends a prompt to an LLM provider (Ollama or OpenAI) and returns
    the response. Supports structured JSON output parsing.
    """

    async def run(self, node_config: dict, context: ExecutionContext) -> NodeResult:
        prompt = node_config.get("prompt_template", "")
        if not prompt:
            return NodeResult(
                status="failed",
                error="AI node has no prompt_template configured",
            )

        model = node_config.get("model", "ollama/mistral")
        timeout = node_config.get("timeout_seconds", 60)

        # Route to the correct provider
        if model.startswith("ollama/"):
            model_name = model.split("/", 1)[1]
            response_text = await self._call_ollama(model_name, prompt, timeout)
        elif model.startswith("openai/"):
            return NodeResult(
                status="failed",
                error="OpenAI BYOK not yet implemented. Use an Ollama model.",
            )
        else:
            return NodeResult(
                status="failed",
                error=f"Unknown model provider: {model}",
            )

        # Try to parse as JSON if the response looks like JSON
        output = self._parse_response(response_text)

        return NodeResult(
            status="completed",
            output=output,
        )

    async def _call_ollama(self, model: str, prompt: str, timeout: int) -> str:
        """Call Ollama's local REST API."""
        url = f"{settings.OLLAMA_BASE_URL}/api/generate"

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
        }

        logger.info(
            "ollama_request",
            model=model,
            prompt_length=len(prompt),
            timeout=timeout,
        )

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload)

            if response.status_code != 200:
                raise RuntimeError(
                    f"Ollama returned status {response.status_code}: {response.text}"
                )

            data = response.json()
            response_text = data.get("response", "")

            logger.info(
                "ollama_response",
                model=model,
                response_length=len(response_text),
            )

            return response_text

    @staticmethod
    def _parse_response(text: str) -> dict:
        """
        Attempt to parse the LLM response as JSON.

        If the response contains a JSON block (possibly wrapped in markdown
        code fences), extract and parse it. Otherwise, return the raw text
        in a simple dict.
        """
        cleaned = text.strip()

        # Remove markdown code fences if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # Try JSON parsing
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
            # If it parsed to a list or primitive, wrap it
            return {"result": parsed}
        except (json.JSONDecodeError, ValueError):
            pass

        # Try to find JSON object within the text
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(cleaned[start : end + 1])
                if isinstance(parsed, dict):
                    return parsed
            except (json.JSONDecodeError, ValueError):
                pass

        # Fallback: return raw text
        return {"raw_response": text.strip()}
