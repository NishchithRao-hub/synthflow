# backend/app/worker/database.py

from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# Convert async URL to sync URL for the worker
# postgresql+asyncpg://... → postgresql+psycopg2://... or postgresql://...
SYNC_DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql+asyncpg", "postgresql+psycopg2"
)

# Create a synchronous engine for the worker process
_sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
    pool_size=3,
    max_overflow=5,
    pool_pre_ping=True,
)

_sync_session_factory = sessionmaker(
    bind=_sync_engine,
    class_=Session,
    expire_on_commit=False,
)


@contextmanager
def get_worker_db():
    """
    Provide a synchronous database session for worker tasks.

    Celery workers use sync sessions to avoid event loop conflicts.
    """
    session = _sync_session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
