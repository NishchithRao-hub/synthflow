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
    # Task routes
    task_routes={
        "app.worker.tasks.*": {"queue": "execution"},
        "app.worker.beat_tasks.*": {"queue": "default"},
    },
    # Default queue
    task_default_queue="default",
    # Beat schedule — periodic tasks
    beat_schedule={
        "recover-dead-runs": {
            "task": "app.worker.beat_tasks.recover_dead_runs",
            "schedule": 300.0,  # Every 5 minutes
        },
        "cleanup-old-runs": {
            "task": "app.worker.beat_tasks.cleanup_old_runs",
            "schedule": 86400.0,  # Every 24 hours
        },
    },
)

# Auto-discover tasks from both modules
celery_app.autodiscover_tasks(["app.worker", "app.worker.beat_tasks"])
