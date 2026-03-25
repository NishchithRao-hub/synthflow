# backend/app/routers/webhooks.py

import structlog
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.rate_limiter import check_rate_limit
from app.models.workflow import Workflow
from app.models.workflow_run import WorkflowRun
from app.worker.tasks import execute_workflow_run_task

logger = structlog.get_logger()

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# Rate limit: 10 requests per minute per workflow
WEBHOOK_RATE_LIMIT = 10
WEBHOOK_RATE_WINDOW = 60


@router.post("/{workflow_id}", status_code=202)
async def webhook_trigger(workflow_id: str, request: Request):
    """
    Public webhook endpoint - no authentication required.

    External services POST JSON data to this URL to trigger a workflow.
    The entire request body is passed as the trigger input.

    Rate limited to 10 requests per minute per workflow.
    Returns 202 Accepted with the run ID.
    """
    # Rate limiting
    rate_key = f"webhook_rate:{workflow_id}"
    is_allowed, rate_info = await check_rate_limit(
        rate_key, max_requests=WEBHOOK_RATE_LIMIT, window_seconds=WEBHOOK_RATE_WINDOW
    )

    if not is_allowed:
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "message": f"Rate limit exceeded. Maximum {WEBHOOK_RATE_LIMIT} "
                    f"requests per {WEBHOOK_RATE_WINDOW} seconds.",
                    "status_code": 429,
                    "retry_after_seconds": rate_info["reset_seconds"],
                }
            },
            headers={
                "Retry-After": str(rate_info["reset_seconds"]),
                "X-RateLimit-Limit": str(rate_info["limit"]),
                "X-RateLimit-Remaining": str(rate_info["remaining"]),
            },
        )

    # Parse request body
    try:
        body = await request.json()
    except Exception:
        raw = await request.body()
        body = {"raw_body": raw.decode("utf-8", errors="replace")}

    # Validate payload size (1MB max)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 1_048_576:
        raise BadRequestException("Webhook payload too large (max 1MB)")

    async with async_session_factory() as db:
        # Fetch workflow
        query = select(Workflow).where(Workflow.id == workflow_id)
        result = await db.execute(query)
        workflow = result.scalar_one_or_none()

        if workflow is None:
            raise NotFoundException("Workflow", workflow_id)

        if not workflow.is_active:
            raise BadRequestException("Workflow is inactive")

        # Check concurrency policy
        policy = workflow.concurrency_policy or "allow_parallel"

        if policy == "skip":
            active_query = select(WorkflowRun).where(
                WorkflowRun.workflow_id == workflow.id,
                WorkflowRun.status.in_(["pending", "running"]),
            )
            active_result = await db.execute(active_query)
            active_run = active_result.scalar_one_or_none()

            if active_run:
                logger.info(
                    "webhook_skipped_concurrent",
                    workflow_id=workflow_id,
                    active_run_id=active_run.id,
                )
                return {
                    "status": "skipped",
                    "message": "Workflow has an active run. Concurrency policy is 'skip'.",
                    "active_run_id": active_run.id,
                }

        # Create run record
        run = WorkflowRun(
            workflow_id=workflow.id,
            workflow_version=workflow.version,
            status="pending",
            trigger_type="webhook",
            trigger_input=body,
            execution_context={},
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)

        logger.info(
            "webhook_triggered",
            workflow_id=workflow_id,
            run_id=run.id,
            payload_keys=list(body.keys()) if isinstance(body, dict) else "non-dict",
        )

    # Enqueue for execution
    execute_workflow_run_task.delay(run.id)

    # Include rate limit headers in success response
    return JSONResponse(
        status_code=202,
        content={
            "run_id": run.id,
            "workflow_id": workflow_id,
            "status": "pending",
            "message": "Workflow execution queued",
        },
        headers={
            "X-RateLimit-Limit": str(rate_info["limit"]),
            "X-RateLimit-Remaining": str(rate_info["remaining"]),
        },
    )
