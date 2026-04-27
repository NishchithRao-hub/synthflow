# Local Development Guide

## Prerequisites

- Python 3.11+
- Poetry
- Node.js 20+
- npm (or pnpm)
- Docker Desktop (or Docker Engine + Compose)

## 1) Clone and Initial Setup

```bash
git clone <your-repo-url>
cd synthflow
cp .env.example .env
```

Edit .env with your local and provider credentials.

Important note:

- docker-compose.yml publishes PostgreSQL on host port 5433
- If backend runs on host, DATABASE_URL should use localhost:5433

Recommended local DB URL:

```env
DATABASE_URL=postgresql+asyncpg://synthflow:synthflow_dev@localhost:5433/synthflow
```

## 2) Start Infrastructure

From repo root:

```bash
docker compose up -d
```

Validate services:

```bash
docker compose ps
```

## 3) Backend Setup

```bash
cd backend
poetry install
poetry run alembic upgrade head
```

Run API server:

```bash
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run worker (new terminal):

```bash
cd backend
poetry run celery -A app.worker.celery_app worker --loglevel=info --pool=prefork --concurrency=2 --queues=default,execution
```

Windows note: use `--pool=solo` instead of `--pool=prefork`.

```bash
cd backend
poetry run celery -A app.worker.celery_app worker --loglevel=info --pool=solo --queues=default,execution
```

Run beat scheduler (new terminal):

```bash
cd backend
poetry run celery -A app.worker.celery_app beat --loglevel=info
```

## 4) Frontend Setup

Create or update frontend/.env.local:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

Run frontend:

```bash
cd frontend
npm install
npm run dev
```

## 5) Verify Local Environment

- Frontend: http://localhost:3000
- API root: http://localhost:8000
- Health: http://localhost:8000/api/health
- Swagger: http://localhost:8000/docs

## Test and Quality Commands

Backend:

```bash
cd backend
poetry run pytest
poetry run ruff check .
poetry run black .
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Seed Demo Workflows

```bash
cd backend
poetry run python seed_demo_workflows.py <user_email>
```

This seeds ready-to-demo workflows for walkthroughs.

## Common Troubleshooting

### DB connection failures

- Ensure Docker containers are running
- Check DATABASE_URL port mapping (5433 for host access)
- Re-run migration: poetry run alembic upgrade head

### Worker not consuming tasks

- Ensure REDIS_URL is reachable
- Verify worker queue flags include default,execution
- Check worker logs for import/runtime errors
- On Windows, avoid `--pool=prefork`; use `--pool=solo` or run the worker inside WSL/Linux/Docker

### WebSocket not streaming

- Confirm valid JWT token passed as ws query param
- Ensure Redis pub/sub connectivity
- Verify run status updates are being published by worker
