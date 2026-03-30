# backend/app/core/timeout.py

import asyncio
from dataclasses import dataclass

import structlog

from app.core.execution_context import NodeResult

logger = structlog.get_logger()

# Default timeouts by node type (seconds)
DEFAULT_TIMEOUTS = {
    "trigger": 10,
    "ai": 120,
    "action": 30,
}

# Global run timeout
DEFAULT_RUN_TIMEOUT = 300  # 5 minutes


@dataclass
class TimeoutConfig:
    """Timeout configuration for a node or run."""

    node_timeout: int  # seconds
    run_timeout: int = DEFAULT_RUN_TIMEOUT

    @staticmethod
    def from_node_config(node_type: str, config: dict) -> "TimeoutConfig":
        """Extract timeout from node config, falling back to defaults."""
        default = DEFAULT_TIMEOUTS.get(node_type, 30)
        node_timeout = config.get("timeout_seconds", default)
        return TimeoutConfig(node_timeout=node_timeout)


async def execute_with_timeout(
    coro,
    timeout_seconds: int,
    node_id: str,
) -> NodeResult:
    """
    Execute an async coroutine with a timeout.

    If the coroutine doesn't complete within timeout_seconds,
    returns a failed NodeResult with a timeout error.

    Args:
        coro: The coroutine to execute (should return NodeResult)
        timeout_seconds: Maximum execution time
        node_id: For logging

    Returns:
        NodeResult — either the actual result or a timeout failure
    """
    try:
        result = await asyncio.wait_for(coro, timeout=timeout_seconds)
        return result
    except asyncio.TimeoutError:
        logger.warning(
            "node_execution_timed_out",
            node_id=node_id,
            timeout_seconds=timeout_seconds,
        )
        return NodeResult(
            status="failed",
            error=f"Execution timed out after {timeout_seconds} seconds",
            duration_ms=timeout_seconds * 1000,
        )


class RunTimeoutTracker:
    """
    Tracks elapsed time for a workflow run and checks if the
    global timeout has been exceeded.

    Usage:
        tracker = RunTimeoutTracker(timeout_seconds=300)
        ...
        if tracker.is_expired():
            # Stop execution
        remaining = tracker.remaining_seconds()
    """

    def __init__(self, timeout_seconds: int = DEFAULT_RUN_TIMEOUT):
        self.timeout_seconds = timeout_seconds
        self._start_time: float | None = None

    def start(self) -> None:
        """Mark the start of the run."""
        import time

        self._start_time = time.perf_counter()

    def elapsed_seconds(self) -> float:
        """Get elapsed time since start."""
        if self._start_time is None:
            return 0.0
        import time

        return time.perf_counter() - self._start_time

    def remaining_seconds(self) -> float:
        """Get remaining time before timeout."""
        remaining = self.timeout_seconds - self.elapsed_seconds()
        return max(0.0, remaining)

    def is_expired(self) -> bool:
        """Check if the run has exceeded its timeout."""
        return self.elapsed_seconds() >= self.timeout_seconds
