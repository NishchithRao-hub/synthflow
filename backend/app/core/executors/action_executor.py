# backend/app/core/executors/action_executor.py

import json

import httpx
import structlog

from app.core.execution_context import ExecutionContext, NodeResult
from app.core.executors.base import NodeExecutor

logger = structlog.get_logger()

# Prevent SSRF: block requests to private/internal IPs
BLOCKED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "10.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "192.168.",
    "169.254.",
]


class ActionExecutor(NodeExecutor):
    """
    Executor for HTTP action nodes.

    Sends HTTP requests to external APIs and returns the response.
    Supports configurable method, URL, headers, body, and timeout.
    """

    async def run(self, node_config: dict, context: ExecutionContext) -> NodeResult:
        url = node_config.get("url", "")
        if not url:
            return NodeResult(
                status="failed",
                error="Action node has no URL configured",
            )

        method = node_config.get("method", "POST").upper()
        timeout = node_config.get("timeout_seconds", 10)

        # SSRF protection
        if self._is_blocked_url(url):
            return NodeResult(
                status="failed",
                error=f"Requests to private/internal addresses are not allowed: {url}",
            )

        # Parse headers
        headers = self._parse_headers(node_config.get("headers", {}))

        # Parse body
        body = self._parse_body(node_config.get("body_template", ""))

        # Add idempotency key for safe retries
        # Format: {run_id}:{node_id}:{attempt}
        # External services can use this to detect duplicate requests
        idempotency_key = self._build_idempotency_key(context, node_config)
        if idempotency_key:
            headers["X-Idempotency-Key"] = idempotency_key

        logger.info(
            "http_action_request",
            method=method,
            url=url,
            has_idempotency_key=bool(idempotency_key),
            run_id=context.run_id,
        )

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=body if body and method in ("POST", "PUT", "PATCH") else None,
                )

                # Parse response body
                try:
                    response_body = response.json()
                except (json.JSONDecodeError, ValueError):
                    response_body = {"raw_body": response.text[:5000]}

                logger.info(
                    "http_action_response",
                    method=method,
                    url=url,
                    status_code=response.status_code,
                    run_id=context.run_id,
                )

                return NodeResult(
                    status="completed",
                    output={
                        "status_code": response.status_code,
                        "body": response_body,
                        "headers": dict(response.headers),
                    },
                )

        except httpx.TimeoutException:
            return NodeResult(
                status="failed",
                error=f"HTTP request timed out after {timeout} seconds",
            )
        except httpx.ConnectError as e:
            return NodeResult(
                status="failed",
                error=f"Failed to connect to {url}: {str(e)}",
            )
        except Exception as e:
            return NodeResult(
                status="failed",
                error=f"HTTP request failed: {str(e)}",
            )

    @staticmethod
    def _is_blocked_url(url: str) -> bool:
        """Check if a URL targets a private/internal address."""
        try:
            from urllib.parse import urlparse

            parsed = urlparse(url)
            host = parsed.hostname or ""
            for blocked in BLOCKED_HOSTS:
                if host.startswith(blocked) or host == blocked:
                    return True
            return False
        except Exception:
            return True  # Block if we can't parse

    @staticmethod
    def _parse_headers(headers_input: str | dict) -> dict:
        """Parse headers from string (JSON) or dict."""
        if isinstance(headers_input, dict):
            return headers_input
        if isinstance(headers_input, str) and headers_input.strip():
            try:
                parsed = json.loads(headers_input)
                if isinstance(parsed, dict):
                    return parsed
            except (json.JSONDecodeError, ValueError):
                pass
        return {"Content-Type": "application/json"}

    @staticmethod
    def _parse_body(body_input: str | dict) -> dict | None:
        """Parse body from string (JSON) or dict."""
        if isinstance(body_input, dict):
            return body_input if body_input else None
        if isinstance(body_input, str) and body_input.strip():
            try:
                parsed = json.loads(body_input)
                if isinstance(parsed, dict):
                    return parsed
            except (json.JSONDecodeError, ValueError):
                # Return as raw text wrapper
                return {"data": body_input}
        return None

    @staticmethod
    def _build_idempotency_key(
        context: ExecutionContext, node_config: dict
    ) -> str | None:
        """
        Build an idempotency key for this request.

        Format: {run_id}:{node_id}:{attempt_hash}

        This allows external services to detect and deduplicate
        retried requests from the same workflow execution.
        """
        try:
            run_id = context.run_id

            # Get node_id from the context metadata if available
            # We use the run_id + a hash of the config as a stable key
            import hashlib

            config_str = json.dumps(node_config, sort_keys=True)
            config_hash = hashlib.md5(config_str.encode()).hexdigest()[:8]

            return f"{run_id}:{config_hash}"
        except Exception:
            return None
