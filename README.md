# SynthFlow

SynthFlow is a production-oriented AI workflow automation platform inspired by Zapier/n8n style pipelines.
It lets teams design directed workflows, run them asynchronously, connect external systems and monitor each run in real time.

## Table of Contents

- [What SynthFlow Does](#what-synthflow-does)
- [Try Synthflow](#try-synthlow)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start (Local)](#quick-start-local)
- [Environment Variables](#environment-variables)
- [Runbook Commands](#runbook-commands)
- [API Documentation](#api-documentation)
- [Deployment (Production)](#deployment-production)
- [Screenshots and GIFs](#screenshots-and-gifs)
- [Project Documentation](#project-documentation)

## What SynthFlow Does

SynthFlow helps you build and run AI-driven automation workflows with:

- Trigger nodes (manual, webhook, schedule)
- AI nodes (LLM reasoning and transformations)
- Action nodes (HTTP/API integrations)
- DAG-based execution orchestration with retries/timeouts
- Real-time run streaming via WebSocket
- Usage tracking and Stripe-backed plan enforcement
- Artifact storage for large outputs (S3)

## Try Synthlow

You can try the Synthflow workflow automation tool using the below link:

[https://34.204.179.128.nip.io/](https://34.204.179.128.nip.io/)

## Architecture

### High-Level Diagram

```mermaid
flowchart LR
	FE[Frontend\nNext.js + React Flow] -->|HTTPS REST| API[Backend API\nFastAPI]
	FE -->|WebSocket| WS[WS Router]
	API --> DB[(PostgreSQL)]
	API --> REDIS[(Redis)]
	API --> STRIPE[Stripe]
	API --> S3[(AWS S3)]
	API -->|Enqueue Jobs| CELERY[Celery Worker + Beat]
	CELERY --> DB
	CELERY --> REDIS
	CELERY --> OLLAMA[Ollama or OpenAI BYOK]
	CELERY --> EXTERNAL[External APIs / Webhooks]
	WS --> REDIS
```

![Architecture Diagram Placeholder](docs/assets/architecture-overview.png)

The above image shows a detailed architectural diagram with tech stacks with clean data and execution flow.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind, React, TanStack Query
- Backend: Python, FastAPI, SQLAlchemy async, Alembic, Pydantic v2
- Async: Celery + Redis
- Database: PostgreSQL
- Billing: Stripe
- Storage: AWS S3
- AI Providers: Ollama (local), OpenAI (BYOK)
- Deployment: Docker Compose + Nginx (EC2/RDS/S3)

## Quick Start (Local)

### 1. Prerequisites

- Python 3.11+
- Poetry
- Node.js 20+
- npm or pnpm
- Docker + Docker Compose

### 2. Clone and Configure

```bash
git clone https://github.com/NishchithRao-hub/synthflow.git
cd synthflow
cp .env.example .env
```

Update .env with real values for Google OAuth, Stripe and AWS if those features are needed.

Important: Local Docker maps PostgreSQL to host port 5433 in docker-compose.yml. If backend runs on your host machine, set DATABASE_URL to use localhost:5433.

Example:

```env
DATABASE_URL=postgresql+asyncpg://synthflow:synthflow_dev@localhost:5433/synthflow
```

### 3. Start Infrastructure (Postgres + Redis)

```bash
docker compose up -d
docker compose ps
```

### 4. Start Backend

```bash
cd backend
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```

In another terminal, start worker:

```bash
cd backend
poetry run celery -A app.worker.celery_app worker --loglevel=info --pool=prefork --concurrency=2 --queues=default,execution

# On Windows, use the solo pool instead of prefork:
cd backend
poetry run celery -A app.worker.celery_app worker --loglevel=info --pool=solo --queues=default,execution
```

In another terminal, start beat:

```bash
cd backend
poetry run celery -A app.worker.celery_app beat --loglevel=info
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend .env.local template:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 6. Open the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/api/health

## Environment Variables

Primary templates:

- Local: .env.example
- Production: infra/.env.production.example

Core groups:

- App: ENVIRONMENT, DEBUG, FRONTEND_URL, BACKEND_URL
- Database: DATABASE_URL
- Redis: REDIS_URL
- Auth: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET_KEY
- Stripe: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- AWS: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
- LLM: OLLAMA_BASE_URL

## Runbook Commands

### Backend

```bash
cd backend
poetry run pytest
poetry run ruff check .
poetry run black .
```

Seed demo workflows:

```bash
cd backend
poetry run python seed_demo_workflows.py <user_email>
```

If the worker crashes on Windows with `WinError 5` or `WinError 6`, restart it with `--pool=solo`. Celery's prefork pool is intended for Linux/macOS containers and does not behave reliably on Windows.

### Frontend

```bash
cd frontend
npm run lint
npm run build
npm run start
```

## API Documentation

- Swagger UI: /docs
- ReDoc: /redoc
- OpenAPI JSON: /openapi.json

When deployed behind domain:

- https://your-domain/docs
- https://your-domain/redoc

WebSocket pattern:

- ws(s)://host/ws/runs/{run_id}?token={jwt_access_token}

## Deployment (Production)

Production compose and scripts are in infra.

### Standard Flow

1. Copy infra/.env.production.example to .env.production and fill all values.
2. Ensure DNS and SSL certs are set for your domain.
3. Run deployment script:

```bash
bash infra/deploy.sh <EC2_PUBLIC_IP>
```

4. Optional full flow helper:

```bash
bash infra/deploy-production-steps.sh <EC2_PUBLIC_IP>
```

The deploy script syncs files, builds containers, starts services, checks health, and runs migrations.

## Screenshots and GIFs

### Homepage

![Homepage Placeholder](docs/assets/synthflow-homepage.png)

This is the landing Synthflow homepage.

### Dashboard

![Dashboard Placeholder](docs/assets/dashboard-overview.png)

The above image shows the dashboard overview upon login which displays all created workflows.

### Workflow Builder

![Workflow Builder Placeholder](docs/assets/workflow-builder.png)

The image shows building a workflow using drag and drop node types and configurations.

### Run Monitor

![Run Monitor Placeholder](docs/assets/run-monitor.png)

The above image shows execution of a workflow with status and event logs.

### Billing and Usage

![Billing Placeholder](docs/assets/billing-usage.png)

The image shows real-time stats of workflows created, runs and AI calls and their maximum limit based on current user plan.

### End-to-End Demo GIF

![Demo GIF Placeholder](docs/assets/synthflow-demo.gif)

## Project Documentation

Detailed docs are available in docs:

- docs/README.md
- docs/architecture.md
- docs/local-development.md
- docs/deployment.md
- docs/api.md
- docs/screenshots-and-demos.md

## License

MIT (see [LICENSE](LICENSE))
