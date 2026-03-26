# backend/app/core/pubsub.py

import json
from datetime import datetime, timezone

import redis
import redis.asyncio as aioredis
import structlog

from app.core.config import settings

logger = structlog.get_logger()


def get_channel_name(run_id: str) -> str:
    """Get the Redis pub/sub channel name for a workflow run."""
    return f"run:{run_id}"


# --- Sync publisher (used by Celery worker) ---

_sync_redis: redis.Redis | None = None


def get_sync_redis() -> redis.Redis:
    """Get or create a sync Redis client for the worker."""
    global _sync_redis
    if _sync_redis is None:
        _sync_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _sync_redis


def publish_event(run_id: str, event: dict) -> None:
    """
    Publish a real-time event for a workflow run.

    Called by the Celery worker during execution.
    """
    try:
        r = get_sync_redis()
        channel = get_channel_name(run_id)

        # Add timestamp if not present
        if "timestamp" not in event:
            event["timestamp"] = datetime.now(timezone.utc).isoformat()

        message = json.dumps(event)
        r.publish(channel, message)

        logger.debug(
            "event_published",
            channel=channel,
            event_type=event.get("event"),
        )
    except Exception as e:
        # Publishing failures are non-critical — don't break execution
        logger.warning("event_publish_failed", error=str(e), run_id=run_id)


def publish_run_started(run_id: str, workflow_id: str) -> None:
    """Publish a run_started event."""
    publish_event(
        run_id,
        {
            "event": "run_started",
            "data": {
                "run_id": run_id,
                "workflow_id": workflow_id,
                "status": "running",
            },
        },
    )


def publish_node_status(
    run_id: str,
    node_id: str,
    node_type: str,
    status: str,
    duration_ms: int | None = None,
    output: dict | None = None,
    error: str | None = None,
) -> None:
    """Publish a node_status_update event."""
    data: dict = {
        "run_id": run_id,
        "node_id": node_id,
        "node_type": node_type,
        "status": status,
    }
    if duration_ms is not None:
        data["duration_ms"] = duration_ms
    if output is not None:
        # Truncate large outputs for the real-time feed
        output_str = json.dumps(output)
        if len(output_str) > 2000:
            data["output"] = {"_truncated": True, "_size": len(output_str)}
        else:
            data["output"] = output
    if error is not None:
        data["error"] = error[:500]  # Truncate long errors

    publish_event(
        run_id,
        {
            "event": "node_status_update",
            "data": data,
        },
    )


def publish_run_completed(
    run_id: str, workflow_id: str, status: str, duration_ms: int | None = None
) -> None:
    """Publish a run_completed or run_failed event."""
    event_name = "run_completed" if status == "completed" else "run_failed"
    publish_event(
        run_id,
        {
            "event": event_name,
            "data": {
                "run_id": run_id,
                "workflow_id": workflow_id,
                "status": status,
                "duration_ms": duration_ms,
            },
        },
    )


# --- Async subscriber (used by WebSocket endpoint) ---

_async_redis: aioredis.Redis | None = None


async def get_async_redis() -> aioredis.Redis:
    """Get or create an async Redis client for the API."""
    global _async_redis
    if _async_redis is None:
        _async_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _async_redis
