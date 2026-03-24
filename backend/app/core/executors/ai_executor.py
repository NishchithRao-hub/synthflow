# backend/app/core/executors/ai_executor.py

import json

import structlog

from app.core.execution_context import ExecutionContext, NodeResult
from app.core.executors.base import NodeExecutor
from app.core.llm import LLMConfig, get_provider

logger = structlog.get_logger()

# Built-in prompt templates for each subtype
SUBTYPE_SYSTEM_PROMPTS = {
    "classify": (
        "You are a classification engine. Analyze the input and classify it "
        "into the categories specified by the user. Always respond with valid JSON only. "
        "Do not include any explanation or markdown — only the JSON object."
    ),
    "summarize": (
        "You are a summarization engine. Summarize the input concisely. "
        "Always respond with valid JSON only. "
        'Use the format: {"summary": "...", "key_points": ["...", "..."]}'
    ),
    "extract": (
        "You are a data extraction engine. Extract structured information "
        "from the input as specified by the user. Always respond with valid JSON only. "
        "Do not include any explanation or markdown — only the JSON object."
    ),
    "custom": "",
}


class AIExecutor(NodeExecutor):
    """
    Enhanced executor for AI task nodes.

    Features:
    - Provider-agnostic LLM calls (Ollama, OpenAI)
    - Built-in subtypes: classify, summarize, extract, custom
    - Output schema validation with retry
    - Automatic JSON parsing with fallback
    - BYOK support for OpenAI (fetches user's encrypted key)
    """

    async def run(self, node_config: dict, context: ExecutionContext) -> NodeResult:
        prompt = node_config.get("prompt_template", "")
        if not prompt:
            return NodeResult(
                status="failed",
                error="AI node has no prompt_template configured",
            )

        model_string = node_config.get("model", "ollama/phi3:mini")
        timeout = node_config.get("timeout_seconds", 180)
        temperature = node_config.get("temperature", 0.7)
        subtype = node_config.get("subtype", "custom")
        output_schema = node_config.get("output_schema")

        # Get provider and model
        try:
            provider, model_name = get_provider(model_string)
        except ValueError as e:
            return NodeResult(status="failed", error=str(e))

        # Build the LLM config
        llm_config = LLMConfig(
            model=model_name,
            timeout=timeout,
            temperature=temperature,
        )

        # If OpenAI, fetch the user's API key
        if provider.provider_name == "openai":
            api_key = await self._get_user_api_key(context)
            if not api_key:
                return NodeResult(
                    status="failed",
                    error="OpenAI model selected but no API key configured. "
                    "Add your key in Settings > API Keys.",
                )
            llm_config.api_key = api_key

        # Build the full prompt with system context
        full_prompt = self._build_prompt(subtype, prompt, output_schema)

        # First attempt
        logger.info(
            "ai_executor_request",
            model=model_string,
            subtype=subtype,
            prompt_length=len(full_prompt),
            run_id=context.run_id,
        )

        try:
            response = await provider.complete(full_prompt, llm_config)
        except RuntimeError as e:
            return NodeResult(status="failed", error=str(e))

        # Parse the response
        output = self._parse_response(response.text)

        # Validate against schema if provided
        if output_schema:
            validation_error = self._validate_output(output, output_schema)
            if validation_error:
                # Retry once with the validation error as feedback
                logger.info(
                    "ai_executor_retry",
                    reason="schema_validation_failed",
                    error=validation_error,
                    run_id=context.run_id,
                )

                retry_prompt = self._build_retry_prompt(
                    full_prompt, response.text, validation_error, output_schema
                )

                try:
                    retry_response = await provider.complete(retry_prompt, llm_config)
                    output = self._parse_response(retry_response.text)

                    # Validate again
                    retry_validation = self._validate_output(output, output_schema)
                    if retry_validation:
                        logger.warning(
                            "ai_executor_validation_failed_after_retry",
                            error=retry_validation,
                            run_id=context.run_id,
                        )
                        # Return output anyway but log the validation failure
                        output["_validation_warning"] = retry_validation
                except RuntimeError as e:
                    return NodeResult(status="failed", error=f"Retry failed: {str(e)}")

        # Add metadata to output
        output["_model"] = model_string
        output["_provider"] = provider.provider_name

        return NodeResult(
            status="completed",
            output=output,
        )

    def _build_prompt(
        self, subtype: str, user_prompt: str, output_schema: dict | None
    ) -> str:
        """Build the full prompt with system context and schema instructions."""
        parts = []

        # Add system prompt for the subtype
        system_prompt = SUBTYPE_SYSTEM_PROMPTS.get(subtype, "")
        if system_prompt:
            parts.append(f"[SYSTEM]\n{system_prompt}")

        # Add schema instructions if provided
        if output_schema:
            schema_str = json.dumps(output_schema, indent=2)
            parts.append(
                f"[OUTPUT FORMAT]\n"
                f"Your response must be a valid JSON object matching this schema:\n"
                f"{schema_str}\n"
                f"Respond with ONLY the JSON object. No explanation, no markdown."
            )

        # Add the user's prompt
        parts.append(f"[INPUT]\n{user_prompt}")

        return "\n\n".join(parts)

    def _build_retry_prompt(
        self,
        original_prompt: str,
        previous_response: str,
        validation_error: str,
        output_schema: dict,
    ) -> str:
        """Build a retry prompt that includes the validation error as feedback."""
        schema_str = json.dumps(output_schema, indent=2)
        return (
            f"{original_prompt}\n\n"
            f"[CORRECTION NEEDED]\n"
            f"Your previous response was:\n{previous_response[:500]}\n\n"
            f"This failed validation: {validation_error}\n\n"
            f"Please try again. Respond with ONLY a valid JSON object matching:\n"
            f"{schema_str}"
        )

    @staticmethod
    def _validate_output(output: dict, schema: dict) -> str | None:
        """
        Validate output against a simple schema definition.

        The schema format matches our frontend config:
        {
            "type": "object",
            "properties": {
                "classification": {"type": "string"},
                "priority": {"type": "string"},
                "confidence": {"type": "number"}
            },
            "required": ["classification"]
        }

        Returns None if valid, or an error message string if invalid.
        """
        if not isinstance(schema, dict):
            return None

        # Check if output contains raw_response (failed to parse as JSON)
        if "raw_response" in output and len(output) == 1:
            return "Response is not valid JSON"

        # Check required fields
        required_fields = schema.get("required", [])
        properties = schema.get("properties", {})

        missing = [f for f in required_fields if f not in output]
        if missing:
            return f"Missing required fields: {', '.join(missing)}"

        # Check field types
        type_map = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict,
        }

        for field_name, field_def in properties.items():
            if field_name not in output:
                continue  # Optional field not present

            expected_type_str = field_def.get("type", "")
            expected_type = type_map.get(expected_type_str)

            if expected_type and not isinstance(output[field_name], expected_type):
                actual_type = type(output[field_name]).__name__
                return (
                    f"Field '{field_name}' expected type '{expected_type_str}' "
                    f"but got '{actual_type}'"
                )

        return None

    @staticmethod
    def _parse_response(text: str) -> dict:
        """
        Attempt to parse the LLM response as JSON.

        Handles: clean JSON, markdown-fenced JSON, JSON embedded in text,
        and falls back to raw text.
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

        # Try direct JSON parsing
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
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

    @staticmethod
    async def _get_user_api_key(context: ExecutionContext) -> str | None:
        """
        Fetch the user's encrypted OpenAI API key from the database.

        Uses the workflow_id from the context to find the workflow owner,
        then decrypts their stored key.
        """
        try:
            from sqlalchemy import select

            from app.core.database import async_session_factory
            from app.core.encryption import decrypt_value
            from app.models.workflow import Workflow

            async with async_session_factory() as db:
                # Find the workflow to get the owner
                query = select(Workflow).where(Workflow.id == context.workflow_id)
                result = await db.execute(query)
                workflow = result.scalar_one_or_none()

                if not workflow:
                    return None

                # Find the user
                from app.models.user import User

                user_query = select(User).where(User.id == workflow.owner_id)
                user_result = await db.execute(user_query)
                user = user_result.scalar_one_or_none()

                if not user or not user.encrypted_openai_key:
                    return None

                return decrypt_value(user.encrypted_openai_key)

        except Exception as e:
            logger.error("failed_to_fetch_api_key", error=str(e))
            return None
