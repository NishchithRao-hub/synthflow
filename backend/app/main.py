# backend/app/main.py

import time
from contextlib import asynccontextmanager

import structlog
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
from app.routers import workflows

logger = structlog.get_logger()


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
    description="AI-powered workflow automation platform",
    version="0.1.0",
    lifespan=lifespan,
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
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    return response


# --- Routers ---
app.include_router(workflows.router)


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
    checks = {"api": "healthy", "database": "unhealthy"}
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"

    is_healthy = all(v == "healthy" for v in checks.values())
    return {
        "status": "healthy" if is_healthy else "degraded",
        "checks": checks,
    }
