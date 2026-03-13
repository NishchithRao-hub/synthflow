# backend/app/worker/database.py

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Create a separate engine for the worker process
# (each process should have its own engine/pool)
_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=3,
    max_overflow=5,
    pool_pre_ping=True,
)

_session_factory = async_sessionmaker(
    _engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@asynccontextmanager
async def get_worker_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a database session for worker tasks.

    Unlike the FastAPI dependency, this is a context manager
    that workers use explicitly.
    """
    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def run_async(coro):
    """
    Run an async coroutine from a synchronous Celery task.

    Creates a new event loop for each task execution.
    This is the bridge between Celery's sync world and our async codebase.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
