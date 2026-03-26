# backend/app/routers/ws.py

import asyncio
import json

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.auth import verify_access_token
from app.core.pubsub import get_async_redis, get_channel_name

logger = structlog.get_logger()

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/runs/{run_id}")
async def run_websocket(websocket: WebSocket, run_id: str):
    """
    WebSocket endpoint for real-time workflow run updates.

    Connection: ws://host/ws/runs/{run_id}?token={jwt_access_token}

    Authenticates via JWT token passed as query parameter.
    Subscribes to Redis pub/sub channel for the run and streams
    events to the client.

    Events sent to client:
    - run_started
    - node_status_update
    - run_completed
    - run_failed
    - ping (keepalive every 15s)
    """
    # Authenticate via query parameter
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    try:
        payload = verify_access_token(token)
        user_id = payload.get("sub")
    except JWTError:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    # Accept the connection
    await websocket.accept()

    logger.info(
        "websocket_connected",
        run_id=run_id,
        user_id=user_id,
    )

    # Subscribe to Redis pub/sub
    redis = await get_async_redis()
    pubsub = redis.pubsub()
    channel = get_channel_name(run_id)
    await pubsub.subscribe(channel)

    try:
        # Run two tasks concurrently:
        # 1. Listen to Redis and forward events to WebSocket
        # 2. Send periodic pings to keep the connection alive
        # 3. Listen for client messages (for graceful disconnect)

        await asyncio.gather(
            _stream_events(websocket, pubsub, run_id),
            _send_pings(websocket),
            _listen_client(websocket),
        )

    except WebSocketDisconnect:
        logger.info("websocket_disconnected", run_id=run_id, user_id=user_id)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error("websocket_error", run_id=run_id, error=str(e))
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
        logger.info("websocket_cleanup", run_id=run_id)


async def _stream_events(websocket: WebSocket, pubsub, run_id: str) -> None:
    """
    Listen to Redis pub/sub and forward events to the WebSocket client.

    Stops when a terminal event (run_completed, run_failed) is received.
    """
    terminal_events = {"run_completed", "run_failed"}

    while True:
        try:
            message = await asyncio.wait_for(
                pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0),
                timeout=2.0,
            )

            if message and message["type"] == "message":
                event_data = message["data"]

                # Forward to WebSocket client
                await websocket.send_text(event_data)

                # Check if this is a terminal event
                try:
                    parsed = json.loads(event_data)
                    if parsed.get("event") in terminal_events:
                        # Give client a moment to process, then close
                        await asyncio.sleep(0.5)
                        await websocket.close(code=1000, reason="Run completed")
                        return
                except (json.JSONDecodeError, ValueError):
                    pass

        except asyncio.TimeoutError:
            # No message in this cycle, continue listening
            continue
        except WebSocketDisconnect:
            return
        except Exception as e:
            logger.warning("stream_event_error", run_id=run_id, error=str(e))
            return


async def _send_pings(websocket: WebSocket) -> None:
    """Send periodic ping messages to keep the WebSocket connection alive."""
    while True:
        try:
            await asyncio.sleep(15)
            await websocket.send_text(json.dumps({"event": "ping", "data": {}}))
        except (WebSocketDisconnect, Exception):
            return


async def _listen_client(websocket: WebSocket) -> None:
    """
    Listen for client messages.

    This mainly exists to detect client disconnection gracefully.
    We don't expect the client to send meaningful data.
    """
    try:
        while True:
            data = await websocket.receive_text()
            # Client might send a "close" message
            if data == "close":
                await websocket.close(code=1000)
                return
    except (WebSocketDisconnect, Exception):
        return
