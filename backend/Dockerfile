# backend/Dockerfile

FROM python:3.13-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --only main --no-interaction --no-ansi && \
    pip uninstall -y poetry

# Copy application code
COPY . .

# --- API target ---
FROM base AS api
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

# --- Worker target ---
FROM base AS worker
CMD ["celery", "-A", "app.worker.celery_app", "worker", "--loglevel=info", "--pool=prefork", "--concurrency=2", "--queues=default,execution"]

# --- Beat target ---
FROM base AS beat
CMD ["celery", "-A", "app.worker.celery_app", "beat", "--loglevel=info"]
