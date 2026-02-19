from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify database connection
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    print(f" {settings.APP_NAME} connected to database")
    yield
    # Shutdown: dispose engine
    await engine.dispose()
    print(f" {settings.APP_NAME} shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered workflow automation platform",
    version="0.1.0",
    lifespan=lifespan,
)


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
