# backend/app/worker/celery_app.py

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "synthflow",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Configuration
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Task behavior
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Result expiry (24 hours)
    result_expires=86400,
    # Task time limits
    task_soft_time_limit=270,  # 4.5 minutes — sends SoftTimeLimitExceeded
    task_time_limit=300,  # 5 minutes — hard kill
    # Retry on connection failure at startup
    broker_connection_retry_on_startup=True,
    # Task routes (all execution tasks go to the 'execution' queue)
    task_routes={
        "app.worker.tasks.*": {"queue": "execution"},
    },
    # Default queue
    task_default_queue="default",
)

# Auto-discover tasks from the worker module
celery_app.autodiscover_tasks(["app.worker"])
