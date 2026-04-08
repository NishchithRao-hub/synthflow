# backend/app/main.py

import time
from contextlib import asynccontextmanager

import structlog as structlog_module
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import (
    SynthFlowException,
    generic_exception_handler,
    synthflow_exception_handler,
)
from app.core.logging import generate_request_id, setup_logging
from app.routers import artifacts, auth, billing, executions, webhooks, workflows, ws
from app.routers import settings as settings_router

setup_logging()
logger = structlog_module.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("database_connected", app=settings.APP_NAME)
    yield
    await engine.dispose()
    logger.info("shutdown_complete", app=settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="""
## SynthFlow — AI-Powered Workflow Automation Platform

Design, execute, and monitor intelligent automation pipelines that combine AI, webhooks, and external APIs.

### Key Features
- **Visual Workflow Builder** — Drag-and-drop canvas for designing DAG-based workflows
- **AI Task Nodes** — Classify, summarize, extract, and transform data using LLMs (Ollama, OpenAI)
- **External Integrations** — Webhook triggers and HTTP action nodes for connecting services
- **Real-Time Monitoring** — WebSocket-based live execution tracking
- **Async Execution** — Background processing via Celery with retry and timeout policies
- **Usage-Based Billing** — Free and Pro tiers with Stripe integration

### Authentication
All API endpoints (except webhooks and health checks) require a Bearer JWT token.
Obtain tokens via the `POST /api/auth/google` endpoint.

### WebSocket
Connect to `ws(s)://host/ws/runs/{run_id}?token={jwt}` for real-time execution updates.
""",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "Google OAuth login, token refresh, and user profile",
        },
        {
            "name": "Workflows",
            "description": "Create, read, update, and delete workflow definitions",
        },
        {
            "name": "Execution",
            "description": "Trigger workflow runs and inspect execution results",
        },
        {
            "name": "Webhooks",
            "description": "Public endpoints for external services to trigger workflows",
        },
        {
            "name": "Billing",
            "description": "Usage tracking, plan management, and Stripe checkout",
        },
        {"name": "Settings", "description": "User preferences and API key management"},
        {
            "name": "Artifacts",
            "description": "Download large execution outputs stored in S3",
        },
        {"name": "WebSocket", "description": "Real-time execution status streaming"},
    ],
)

# --- Exception Handlers ---
app.add_exception_handler(SynthFlowException, synthflow_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = generate_request_id()
    structlog_module.contextvars.clear_contextvars()
    structlog_module.contextvars.bind_contextvars(request_id=request_id)

    start_time = time.perf_counter()

    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # Skip logging for health checks to reduce noise
    if not request.url.path.startswith("/api/health"):
        logger.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    return response


# --- Routers ---
app.include_router(workflows.router)
app.include_router(auth.router)
app.include_router(executions.router)
app.include_router(settings_router.router)
app.include_router(webhooks.router)
app.include_router(ws.router)
app.include_router(billing.router)
app.include_router(artifacts.router)


# --- Root and Health ---
@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
        "status": "running",
    }


@app.get("/api/health")
async def health_check():
    checks = {"api": "healthy", "database": "unhealthy", "redis": "unhealthy"}

    # Check database
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"

    # Check Redis
    try:
        from app.core.pubsub import get_async_redis

        redis = await get_async_redis()
        await redis.ping()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"

    is_healthy = all(v == "healthy" for v in checks.values())
    return {
        "status": "healthy" if is_healthy else "degraded",
        "checks": checks,
    }


@app.get("/api/health/ready")
async def readiness_check():
    """
    Detailed readiness check for monitoring.

    Returns component status, version info, and basic metrics.
    """
    checks = {}
    details = {}

    # Database
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT count(*) FROM users"))
            user_count = result.scalar_one()
        checks["database"] = "ready"
        details["database"] = {"user_count": user_count}
    except Exception as e:
        checks["database"] = "not_ready"
        details["database"] = {"error": str(e)}

    # Redis
    try:
        from app.core.pubsub import get_async_redis

        redis = await get_async_redis()
        info = await redis.info("memory")
        checks["redis"] = "ready"
        details["redis"] = {
            "used_memory_human": info.get("used_memory_human", "unknown"),
        }
    except Exception as e:
        checks["redis"] = "not_ready"
        details["redis"] = {"error": str(e)}

    # Workflow stats
    try:
        async with engine.begin() as conn:
            wf_count = (
                await conn.execute(text("SELECT count(*) FROM workflows"))
            ).scalar_one()
            run_count = (
                await conn.execute(text("SELECT count(*) FROM workflow_runs"))
            ).scalar_one()
        details["stats"] = {
            "total_workflows": wf_count,
            "total_runs": run_count,
        }
    except Exception:
        details["stats"] = {}

    is_ready = all(v == "ready" for v in checks.values())
    return {
        "status": "ready" if is_ready else "not_ready",
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
        "checks": checks,
        "details": details,
    }
