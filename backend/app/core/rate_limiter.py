# backend/app/core/rate_limiter.py

import time

import redis.asyncio as aioredis
import structlog

from app.core.config import settings

logger = structlog.get_logger()

# Async Redis client for rate limiting
_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Get or create the async Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
    return _redis_client


async def check_rate_limit(
    key: str,
    max_requests: int = 10,
    window_seconds: int = 60,
) -> tuple[bool, dict]:
    """
    Check if a request is within the rate limit using a sliding window.

    Uses Redis sorted sets for accurate sliding window rate limiting.

    Args:
        key: Unique identifier (e.g., "webhook:workflow_id")
        max_requests: Maximum requests allowed in the window
        window_seconds: Time window in seconds

    Returns:
        (is_allowed, info_dict)
        - is_allowed: True if the request should proceed
        - info_dict: Contains remaining requests, reset time, etc.
    """
    try:
        r = await get_redis()
        now = time.time()
        window_start = now - window_seconds

        pipe = r.pipeline()

        # Remove expired entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count current entries in window
        pipe.zcard(key)

        # Add current request (optimistically)
        pipe.zadd(key, {str(now): now})

        # Set TTL on the key so it auto-expires
        pipe.expire(key, window_seconds)

        results = await pipe.execute()
        current_count = results[1]  # zcard result

        remaining = max(0, max_requests - current_count - 1)
        is_allowed = current_count < max_requests

        if not is_allowed:
            # Remove the optimistically added entry
            await r.zrem(key, str(now))

            logger.warning(
                "rate_limit_exceeded",
                key=key,
                current_count=current_count,
                max_requests=max_requests,
            )

        return is_allowed, {
            "limit": max_requests,
            "remaining": remaining,
            "reset_seconds": window_seconds,
            "current": current_count,
        }

    except Exception as e:
        # If Redis is down, allow the request (fail open)
        logger.error("rate_limit_check_failed", error=str(e))
        return True, {
            "limit": max_requests,
            "remaining": max_requests,
            "reset_seconds": window_seconds,
            "current": 0,
            "error": "Rate limiter unavailable",
        }
