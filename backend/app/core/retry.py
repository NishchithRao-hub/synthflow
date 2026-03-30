# backend/app/core/retry.py

import asyncio
from dataclasses import dataclass

import structlog

logger = structlog.get_logger()


@dataclass
class RetryPolicy:
    """Configuration for node retry behavior."""

    max_retries: int = 3
    base_delay_seconds: float = 1.0
    max_delay_seconds: float = 30.0
    backoff_multiplier: float = 2.0

    @staticmethod
    def from_node_config(config: dict) -> "RetryPolicy":
        """Extract retry policy from a node's config dict."""
        return RetryPolicy(
            max_retries=config.get("retry_count", 3),
            base_delay_seconds=config.get("retry_delay_seconds", 1.0),
            max_delay_seconds=config.get("retry_max_delay_seconds", 30.0),
            backoff_multiplier=config.get("retry_backoff_multiplier", 2.0),
        )

    def get_delay(self, attempt: int) -> float:
        """
        Calculate delay before the next retry using exponential backoff.

        attempt is 1-based: attempt=1 means first retry.
        delay = base_delay * multiplier^(attempt - 1)
        """
        delay = self.base_delay_seconds * (self.backoff_multiplier ** (attempt - 1))
        return min(delay, self.max_delay_seconds)

    def should_retry(self, attempt: int) -> bool:
        """Check if another retry attempt should be made."""
        return attempt <= self.max_retries


async def execute_with_retry(
    executor,
    node_id: str,
    node_type: str,
    node_config: dict,
    context,
    retry_policy: RetryPolicy,
    timeout_seconds: int | None = None,
) -> tuple:
    """
    Execute a node with retry logic and per-attempt timeout.

    Returns (node_result, total_attempts) where total_attempts
    is the number of times execution was attempted (1 = no retries).
    """
    from app.core.execution_context import NodeResult
    from app.core.timeout import execute_with_timeout

    last_result: NodeResult | None = None

    for attempt in range(1, retry_policy.max_retries + 2):
        # Create the execution coroutine
        coro = executor.execute(
            node_id=node_id,
            node_type=node_type,
            node_config=node_config,
            context=context,
        )

        # Apply timeout if configured
        if timeout_seconds and timeout_seconds > 0:
            result = await execute_with_timeout(coro, timeout_seconds, node_id)
        else:
            result = await coro

        if result.status != "failed":
            return result, attempt

        last_result = result

        if not retry_policy.should_retry(attempt):
            logger.info(
                "node_retries_exhausted",
                node_id=node_id,
                attempts=attempt,
                error=result.error,
            )
            break

        delay = retry_policy.get_delay(attempt)
        logger.info(
            "node_retry_scheduled",
            node_id=node_id,
            attempt=attempt,
            next_attempt=attempt + 1,
            delay_seconds=delay,
            error=result.error,
        )
        await asyncio.sleep(delay)

    return last_result, attempt
