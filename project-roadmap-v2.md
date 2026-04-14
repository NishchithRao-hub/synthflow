# AI Agent Workflow Platform — Implementation Roadmap v2

## Project Goal

Build a production-grade, cloud-deployable web application that functions as a **"Zapier-like automation platform powered by AI agents."** The system will enable users—especially developers and technical teams—to design, execute, and monitor automated workflows that connect events, artificial intelligence, and external services into cohesive pipelines.

Users will be able to visually construct workflows as directed graphs composed of:

- **Trigger nodes** that start executions (manual runs, webhooks, scheduled events)
- **AI task nodes** that perform reasoning-heavy operations using large language models (e.g., summarization, classification, information extraction, decision-making)
- **Action nodes** that interact with external systems via APIs (e.g., sending messages, creating tickets, updating resources)

The platform will orchestrate these workflows end-to-end, handling execution order, data passing between steps, asynchronous processing, retries, failures, and logging. Workflows may run for extended durations and must therefore execute reliably in the background using a queue-based architecture.

A core objective is to demonstrate how modern software systems coordinate AI capabilities with real-world services. Rather than acting as a simple chatbot interface, the platform treats AI as one component within a larger automation pipeline that responds to events and produces concrete outcomes.

The system will provide:

- A visual drag-and-drop workflow builder
- A backend orchestration engine that executes workflows as directed acyclic graphs (DAGs)
- Integration points for external APIs and webhooks
- Real-time execution monitoring and detailed logs
- Persistent storage of workflows, runs, and artifacts
- Secure authentication and user isolation
- Usage-based billing via Stripe (free tier + paid plans)
- Cloud-native deployment using free-tier resources

Ultimately, the goal is to build a **miniature, production-quality automation platform similar in spirit to services like Zapier or n8n**, but enhanced with AI-driven decision-making and designed to showcase advanced backend engineering, distributed processing, and full-stack system design skills suitable for industry-level software engineering roles.

---

## Core Functional Requirements

### Users must be able to:

- Register and log in (Google OAuth + JWT)
- Create, edit, and delete workflows
- Visually design workflows via drag-and-drop
- Execute workflows manually or via triggers
- Use AI steps within workflows
- Integrate with external services via webhooks/APIs
- Monitor workflow execution in real time
- View logs and run history
- Handle failures with retries
- Manage their subscription plan and usage limits

---

## Non-Functional Requirements

- Scalable asynchronous processing
- Stateless API design
- Persistent execution logs
- Secure authentication
- Cloud deployment readiness
- Free-tier compatible infrastructure
- Clean architecture and maintainable codebase
- Sub-second API response times for CRUD operations
- WebSocket latency under 500ms for real-time updates

---

## Recommended Tech Stack

### Frontend

- **Next.js** (React + TypeScript) — industry-standard React framework with SSR support
- **Tailwind CSS** — utility-first styling
- **React Flow** — visual workflow canvas with drag-and-drop
- **TanStack Query** — server state management and caching
- **WebSocket client** (native browser API) — real-time execution updates

### Backend

- **FastAPI** (Python) — async-first API framework
- **Pydantic v2** — request/response validation and serialization
- **SQLAlchemy 2.0** (async) — ORM with async session support
- **Alembic** — database migrations

### Asynchronous Processing

- **Celery** — distributed task queue for workflow execution
- **Redis** — message broker for Celery + caching layer

### Database

- **PostgreSQL** (AWS RDS Free Tier — db.t3.micro, 20GB)

### Cache / Queue

- **Redis** (self-hosted on EC2 — configured with maxmemory policy to stay within RAM limits)

### Storage

- **AWS S3** (5GB free tier) — artifacts and large payloads

### Authentication

- **Google OAuth 2.0** — external identity provider
- **JWT** — access tokens (15 min expiry) + refresh tokens (7 day expiry)

### Payments

- **Stripe** (test mode for development, no charges) — subscription management and usage tracking

### AI / LLM

- **Ollama** (local, free) — primary development and demo model runtime (e.g., Mistral 7B, Llama 3)
- **OpenAI API** (optional) — can be swapped in for production-quality output if user provides their own API key (BYOK model)
- The platform will use a provider-agnostic LLM interface so models can be swapped without code changes

### Deployment

- **AWS EC2** (t3.micro, free tier) — application host
- **AWS RDS PostgreSQL** (db.t3.micro, free tier) — managed database
- **AWS S3** (free tier) — object storage
- **Nginx** — reverse proxy + SSL termination
- **Docker Compose** — local development orchestration

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│   Workflow Builder (React Flow) │ Dashboard │ Logs │ Settings   │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ REST API (HTTPS)             │ WebSocket (WSS)
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                            │
│                                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐   │
│  │ Auth    │  │ Workflow  │  │ Execution │  │ WebSocket     │   │
│  │ Service │  │ CRUD API  │  │ Trigger   │  │ Manager       │   │
│  └─────────┘  └──────────┘  └─────┬─────┘  └───────────────┘   │
│                                   │                             │
│  ┌─────────────┐  ┌──────────┐    │    ┌─────────────────────┐  │
│  │ Stripe      │  │ Usage    │    │    │ Webhook Receiver    │  │
│  │ Service     │  │ Tracker  │    │    │ (Ingress)           │  │
│  └─────────────┘  └──────────┘    │    └─────────────────────┘  │
└───────────────────────────────────┼─────────────────────────────┘
                                    │ Enqueue job
                                    ▼
                            ┌──────────────┐
                            │    Redis     │
                            │  (Broker +   │
                            │   Cache)     │
                            └──────┬───────┘
                                   │ Dequeue job
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WORKER SERVICE (Celery)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              DAG Execution Engine                        │   │
│  │  Topological Sort → Sequential/Parallel Node Execution   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ AI Node      │  │ HTTP Action  │  │ Conditional /        │   │
│  │ Executor     │  │ Executor     │  │ Transform Executor   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ▼                              ▼
       ┌──────────────┐              ┌──────────────┐
       │  PostgreSQL   │              │   AWS S3     │
       │  (RDS)        │              │  (Artifacts) │
       └──────────────┘              └──────────────┘
```

---

## Data Flow Between Nodes — Execution Context Model

This is the core mechanism that connects workflow nodes together. Every node receives input and produces output, and downstream nodes can reference the outputs of any ancestor node.

### Execution Context

When a workflow run begins, an **ExecutionContext** object is created. This is a JSON dictionary that accumulates outputs as nodes execute:

```json
{
  "trigger": {
    "node_id": "node_1",
    "output": {
      "webhook_body": { "ticket_id": 1234, "message": "App is crashing" }
    }
  },
  "nodes": {
    "node_2": {
      "status": "completed",
      "output": {
        "classification": "bug_report",
        "priority": "high",
        "summary": "User reports application crash on login"
      }
    },
    "node_3": {
      "status": "completed",
      "output": {
        "slack_message_id": "msg_abc123",
        "sent_at": "2025-07-15T10:30:00Z"
      }
    }
  }
}
```

### How Nodes Reference Upstream Data

Node configuration supports **template expressions** that reference the execution context using dot notation:

```
{{ trigger.output.webhook_body.message }}
{{ nodes.node_2.output.classification }}
{{ nodes.node_2.output.summary }}
```

The execution engine resolves these templates before passing input to each node executor. If a referenced path does not exist, the engine logs an error and marks the node as failed.

### Node Execution Contract

Every node executor (AI, HTTP, Transform, etc.) implements a standard interface:

```python
class NodeExecutor(ABC):
    @abstractmethod
    async def execute(self, node_config: dict, context: ExecutionContext) -> NodeResult:
        """
        Args:
            node_config: The node's configuration (prompt template, URL, etc.)
            context: The accumulated execution context with all prior outputs

        Returns:
            NodeResult with status, output dict, and optional error
        """
        pass
```

```python
@dataclass
class NodeResult:
    status: str          # "completed" | "failed" | "skipped"
    output: dict         # JSON-serializable output data
    error: str | None    # Error message if failed
    duration_ms: int     # Execution time in milliseconds
```

---

## DAG Execution Strategy

The workflow execution engine is the most critical backend component. Here is the detailed strategy:

### Step 1 — Validation

Before execution, the engine validates:
- The workflow graph is a valid DAG (no cycles) using DFS-based cycle detection
- All nodes have valid configurations
- The trigger node exists and has no incoming edges
- All template expressions reference valid upstream node IDs

### Step 2 — Topological Sort

The engine performs a topological sort (Kahn's algorithm) on the workflow graph to determine execution order. This produces a linear ordering where every node appears after all of its dependencies.

### Step 3 — Sequential Execution (Phase 1 — MVP)

For the initial implementation, nodes execute **sequentially** in topological order. This is simpler to implement, debug, and reason about:

```
Trigger → AI Classify → [Branch A: Slack Notify] → [Branch B: Create Ticket]
```

Even though Branch A and Branch B are independent, they execute one after the other. This is acceptable for an MVP and avoids the complexity of concurrent state management.

### Step 4 — Parallel Execution (Phase 2 — Enhancement, Optional)

If time permits, independent branches (nodes with no dependency relationship) can execute in parallel using Celery group/chord primitives:

```python
# Pseudocode
independent_groups = identify_parallel_groups(topological_order)
for group in independent_groups:
    if len(group) == 1:
        execute_node(group[0])
    else:
        celery.group([execute_node.s(node) for node in group])()
```

This is a stretch goal and should only be attempted after sequential execution is fully stable.

### Step 5 — State Machine

Each workflow run follows this state machine:

```
PENDING → RUNNING → COMPLETED
                  → FAILED
                  → TIMED_OUT (global timeout: 5 minutes per run)

Each node within a run:
PENDING → RUNNING → COMPLETED
                  → FAILED (after retries exhausted)
                  → SKIPPED (if upstream node failed and skip_on_failure is set)
```

---

## Error Handling and Edge Cases

### Scenario: AI node times out mid-workflow
- Each node has a configurable timeout (default: 30 seconds for AI nodes, 10 seconds for HTTP actions)
- If a node times out, it is marked as `FAILED` with error `"Execution timed out after {n} seconds"`
- The retry policy kicks in (see Phase 10)
- If all retries are exhausted, the entire run is marked as `FAILED`
- All subsequent dependent nodes are marked as `SKIPPED`

### Scenario: Webhook trigger fires while the same workflow is already running
- Each workflow has a **concurrency policy** (configurable, default: `allow_parallel`)
  - `allow_parallel`: Multiple runs can execute simultaneously (each gets its own ExecutionContext)
  - `queue`: New trigger is queued and executes after the current run completes
  - `skip`: New trigger is dropped with a log entry `"Skipped: concurrent run already in progress"`

### Scenario: External HTTP action returns a 5xx error
- The HTTP action node retries with exponential backoff: 1s, 2s, 4s (3 retries max)
- Each retry is logged as a separate log entry
- If all retries fail, the node is marked as `FAILED`

### Scenario: LLM returns malformed or unexpected output
- AI nodes validate output against an expected schema (if defined in node config)
- If validation fails, the node retries once with a modified prompt that includes the validation error
- If the retry also fails, the node is marked as `FAILED` with the raw LLM output stored in the error field for debugging

### Scenario: User deletes a workflow while a run is in progress
- Active runs are allowed to complete (orphaned runs)
- The run record is preserved with a flag `workflow_deleted: true`
- No new runs can be triggered

### Scenario: Redis goes down
- Celery workers cannot receive new jobs — new workflow triggers return HTTP 503
- In-progress tasks that have already been dequeued continue executing
- The backend health check endpoint reports degraded status
- A cron-based recovery script can re-enqueue stuck runs (status = `RUNNING` for > 10 minutes)

---

## API Contract Examples

### Authentication

#### POST /api/auth/google
Initiate Google OAuth login.

**Request:**
```json
{
  "credential": "google_id_token_string"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "usr_a1b2c3d4",
    "email": "user@example.com",
    "name": "Jane Doe",
    "avatar_url": "https://lh3.googleusercontent.com/..."
  }
}
```

#### POST /api/auth/refresh
**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 900
}
```

---

### Workflows

#### GET /api/workflows
List all workflows for the authenticated user.

**Response (200):**
```json
{
  "workflows": [
    {
      "id": "wf_x1y2z3",
      "name": "Support Ticket Classifier",
      "description": "Classifies incoming tickets and routes to Slack",
      "node_count": 4,
      "is_active": true,
      "last_run_at": "2025-07-15T10:30:00Z",
      "created_at": "2025-07-01T08:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

#### POST /api/workflows
Create a new workflow.

**Request:**
```json
{
  "name": "Support Ticket Classifier",
  "description": "Classifies incoming tickets and routes to Slack",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "subtype": "webhook",
      "config": {},
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "node_2",
      "type": "ai",
      "subtype": "classify",
      "config": {
        "prompt_template": "Classify the following support ticket into one of these categories: bug_report, feature_request, question, complaint.\n\nTicket: {{ trigger.output.webhook_body.message }}\n\nRespond with JSON: {\"classification\": \"...\", \"priority\": \"high|medium|low\", \"summary\": \"...\"}",
        "model": "ollama/mistral",
        "timeout_seconds": 30,
        "output_schema": {
          "type": "object",
          "properties": {
            "classification": { "type": "string" },
            "priority": { "type": "string" },
            "summary": { "type": "string" }
          }
        }
      },
      "position": { "x": 100, "y": 400 }
    },
    {
      "id": "node_3",
      "type": "action",
      "subtype": "http_request",
      "config": {
        "method": "POST",
        "url": "https://hooks.slack.com/services/T.../B.../xxx",
        "headers": { "Content-Type": "application/json" },
        "body_template": {
          "text": "🎫 New {{ nodes.node_2.output.classification }} ({{ nodes.node_2.output.priority }})\n{{ nodes.node_2.output.summary }}"
        },
        "timeout_seconds": 10,
        "retry_count": 3
      },
      "position": { "x": 100, "y": 600 }
    }
  ],
  "edges": [
    { "source": "node_1", "target": "node_2" },
    { "source": "node_2", "target": "node_3" }
  ]
}
```

**Response (201):**
```json
{
  "id": "wf_x1y2z3",
  "name": "Support Ticket Classifier",
  "webhook_url": "https://api.yourapp.com/webhooks/wf_x1y2z3",
  "created_at": "2025-07-01T08:00:00Z"
}
```

---

### Execution

#### POST /api/workflows/{workflow_id}/execute
Trigger a manual workflow execution.

**Request:**
```json
{
  "input": {
    "message": "The app crashes when I try to log in on iOS"
  }
}
```

**Response (202 — Accepted, async execution):**
```json
{
  "run_id": "run_m1n2o3",
  "workflow_id": "wf_x1y2z3",
  "status": "pending",
  "created_at": "2025-07-15T10:30:00Z",
  "monitor_url": "/api/runs/run_m1n2o3",
  "ws_url": "wss://api.yourapp.com/ws/runs/run_m1n2o3"
}
```

#### GET /api/runs/{run_id}
Get execution status and results.

**Response (200) — In Progress:**
```json
{
  "run_id": "run_m1n2o3",
  "workflow_id": "wf_x1y2z3",
  "status": "running",
  "started_at": "2025-07-15T10:30:01Z",
  "node_statuses": {
    "node_1": { "status": "completed", "duration_ms": 5 },
    "node_2": { "status": "running", "started_at": "2025-07-15T10:30:01Z" },
    "node_3": { "status": "pending" }
  }
}
```

**Response (200) — Completed:**
```json
{
  "run_id": "run_m1n2o3",
  "workflow_id": "wf_x1y2z3",
  "status": "completed",
  "started_at": "2025-07-15T10:30:01Z",
  "completed_at": "2025-07-15T10:30:04Z",
  "duration_ms": 3200,
  "node_statuses": {
    "node_1": { "status": "completed", "duration_ms": 5, "output": { "webhook_body": { "message": "..." } } },
    "node_2": { "status": "completed", "duration_ms": 2800, "output": { "classification": "bug_report", "priority": "high", "summary": "..." } },
    "node_3": { "status": "completed", "duration_ms": 350, "output": { "slack_message_id": "msg_abc123" } }
  }
}
```

---

### WebSocket Messages

#### Connection
```
wss://api.yourapp.com/ws/runs/{run_id}?token={jwt_access_token}
```

#### Server → Client message format:
```json
{
  "event": "node_status_update",
  "timestamp": "2025-07-15T10:30:02Z",
  "data": {
    "run_id": "run_m1n2o3",
    "node_id": "node_2",
    "status": "completed",
    "duration_ms": 2800,
    "output": {
      "classification": "bug_report",
      "priority": "high",
      "summary": "User reports application crash on login"
    }
  }
}
```

#### Event types:
- `run_started` — workflow execution has begun
- `node_status_update` — a node changed status (running, completed, failed, skipped)
- `run_completed` — workflow execution finished (includes final status)
- `run_failed` — workflow execution failed (includes error details)
- `log_entry` — informational log line (for debug/verbose mode)

---

### Webhook Ingress

#### POST /webhooks/{workflow_id}
External systems call this to trigger a workflow.

**Request (any JSON body):**
```json
{
  "ticket_id": 1234,
  "message": "The app crashes when I try to log in on iOS",
  "user_email": "customer@example.com"
}
```

**Response (202):**
```json
{
  "run_id": "run_p4q5r6",
  "status": "pending",
  "message": "Workflow execution queued"
}
```

---

### Stripe / Billing

#### GET /api/billing/usage
Get current usage for the authenticated user.

**Response (200):**
```json
{
  "plan": "free",
  "billing_cycle_start": "2025-07-01T00:00:00Z",
  "billing_cycle_end": "2025-07-31T23:59:59Z",
  "usage": {
    "workflow_runs": { "used": 38, "limit": 50 },
    "ai_node_calls": { "used": 22, "limit": 30 },
    "workflows": { "used": 3, "limit": 5 }
  },
  "upgrade_url": "/settings/billing"
}
```

#### POST /api/billing/create-checkout-session
Create a Stripe checkout session for upgrading.

**Response (200):**
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay_cs_test_..."
}
```

---

## Core Data Models

### Users

| Column         | Type        | Notes                        |
|----------------|-------------|------------------------------|
| id             | UUID (PK)   | Prefixed: `usr_`             |
| email          | VARCHAR     | Unique, from OAuth           |
| name           | VARCHAR     | Display name                 |
| avatar_url     | VARCHAR     | Profile image URL            |
| oauth_provider | VARCHAR     | `google`                     |
| oauth_id       | VARCHAR     | Provider's unique user ID    |
| stripe_customer_id | VARCHAR | Nullable, created on first billing interaction |
| plan           | VARCHAR     | `free` / `pro`               |
| created_at     | TIMESTAMP   |                              |

### Workflows

| Column         | Type        | Notes                        |
|----------------|-------------|------------------------------|
| id             | UUID (PK)   | Prefixed: `wf_`              |
| owner_id       | UUID (FK)   | References Users              |
| name           | VARCHAR     |                              |
| description    | TEXT        |                              |
| graph_data     | JSONB       | Complete node + edge graph    |
| is_active      | BOOLEAN     | Can be disabled               |
| concurrency_policy | VARCHAR | `allow_parallel` / `queue` / `skip` |
| version        | INTEGER     | Incremented on each save      |
| created_at     | TIMESTAMP   |                              |
| updated_at     | TIMESTAMP   |                              |

### Workflow Runs

| Column           | Type        | Notes                        |
|------------------|-------------|------------------------------|
| id               | UUID (PK)   | Prefixed: `run_`             |
| workflow_id      | UUID (FK)   | References Workflows          |
| workflow_version | INTEGER     | Snapshot of version at execution time |
| status           | VARCHAR     | `pending` / `running` / `completed` / `failed` / `timed_out` |
| trigger_type     | VARCHAR     | `manual` / `webhook` / `schedule` |
| trigger_input    | JSONB       | The input data that started the run |
| execution_context| JSONB       | Accumulated node outputs      |
| started_at       | TIMESTAMP   |                              |
| completed_at     | TIMESTAMP   |                              |
| workflow_deleted | BOOLEAN     | True if parent workflow was deleted |
| created_at       | TIMESTAMP   |                              |

### Node Execution Logs

| Column         | Type        | Notes                        |
|----------------|-------------|------------------------------|
| id             | UUID (PK)   |                              |
| run_id         | UUID (FK)   | References Workflow Runs      |
| node_id        | VARCHAR     | The node's ID within the graph|
| node_type      | VARCHAR     | `trigger` / `ai` / `action`  |
| status         | VARCHAR     | `pending` / `running` / `completed` / `failed` / `skipped` |
| input          | JSONB       | Resolved input after template substitution |
| output         | JSONB       | Node execution output         |
| error          | TEXT        | Error message if failed       |
| attempt        | INTEGER     | Retry attempt number (1-based)|
| duration_ms    | INTEGER     |                              |
| created_at     | TIMESTAMP   |                              |

### Usage Records

| Column         | Type        | Notes                        |
|----------------|-------------|------------------------------|
| id             | UUID (PK)   |                              |
| user_id        | UUID (FK)   | References Users              |
| event_type     | VARCHAR     | `workflow_run` / `ai_call`    |
| workflow_id    | UUID        |                              |
| run_id         | UUID        |                              |
| recorded_at    | TIMESTAMP   |                              |

---

## System Components Overview

- **Frontend Web Application** — Next.js app serving the UI
- **Backend API Service** — FastAPI handling REST + WebSocket
- **Workflow Execution Engine** — DAG validator, topological sorter, and orchestrator
- **Background Worker Service** — Celery workers executing nodes
- **Message Queue** — Redis as Celery broker and result backend
- **Cache Layer** — Redis for session data, usage counters, and rate limiting
- **Database** — PostgreSQL for all persistent data
- **Object Storage** — S3 for large artifacts
- **LLM Runtime** — Ollama (local) or OpenAI (BYOK)
- **Payment Service** — Stripe integration for billing

---

# Implementation Phases

---

## Phase 0 — Project Foundations

### Objective
Establish professional development environment and repository structure.

### Tasks

- Create monorepo structure:
```
ai-agent-platform/
├── frontend/          # Next.js app
├── backend/           # FastAPI service
├── worker/            # Celery worker service
├── infra/             # Deployment configs, Nginx, Docker
├── docs/              # Architecture docs, API specs
├── .github/           # CI workflows (GitHub Actions)
├── docker-compose.yml # Local development orchestration
├── .env.example       # Environment variable template
└── README.md
```

- Configure development tooling:
  - Git with conventional commit messages
  - Python: Ruff (linter) + Black (formatter)
  - TypeScript: ESLint + Prettier
  - Pre-commit hooks (Husky for frontend, pre-commit for Python)
  - `.env` management with python-dotenv / Next.js built-in env

- Docker Compose for local development:
  - `postgres` container (port 5432)
  - `redis` container (port 6379)
  - `backend` container (port 8000)
  - `worker` container (Celery)
  - `frontend` container (port 3000)

### Deliverable
Running local environment where all services start with `docker-compose up`.

---

## Phase 1 — Backend Core API

### Objective
Build foundational FastAPI service with database integration.

### Tasks

- FastAPI project structure:
```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings via pydantic-settings
│   ├── database.py          # Async SQLAlchemy engine + session
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/             # API route handlers
│   ├── services/            # Business logic layer
│   ├── core/                # Auth, dependencies, exceptions
│   └── utils/               # Shared utilities
├── alembic/                 # Migration scripts
├── tests/
└── requirements.txt
```

- Implement all ORM models from the Data Models section above
- Set up Alembic and create initial migration
- Implement CRUD endpoints for Workflows:
  - `GET /api/workflows`
  - `POST /api/workflows`
  - `GET /api/workflows/{id}`
  - `PUT /api/workflows/{id}`
  - `DELETE /api/workflows/{id}`
- Health check: `GET /api/health`
- Error handling middleware with consistent error response format
- Request logging middleware

### Deliverable
Working API that can create, read, update, and delete workflows in PostgreSQL.

---

## Phase 2 — Authentication System

### Objective
Implement secure user authentication with Google OAuth.

### Tasks

- Google OAuth 2.0 flow:
  - Frontend initiates Google Sign-In (using `@react-oauth/google`)
  - Frontend sends Google ID token to `POST /api/auth/google`
  - Backend verifies token with Google, creates/finds user, returns JWT pair
- JWT implementation:
  - Access token: 15-minute expiry, contains user ID and email
  - Refresh token: 7-day expiry, stored in database for revocation
  - `POST /api/auth/refresh` endpoint
  - `POST /api/auth/logout` endpoint (revokes refresh token)
- FastAPI dependency for protected routes:
  ```python
  async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
      # Decode JWT, fetch user, raise 401 if invalid
  ```
- All workflow endpoints require authentication
- Users can only access their own workflows (row-level security in queries)

### Deliverable
Users can log in with Google and access only their own data.

---

## Phase 3 — Workflow Builder Frontend

### Objective
Build the visual workflow creation interface.

### Tasks

- Next.js project setup with TypeScript, Tailwind CSS, TanStack Query
- Layout: sidebar navigation, main canvas area, right-side config panel
- React Flow integration:
  - Custom node components for each type (Trigger, AI, Action)
  - Drag from sidebar to add nodes
  - Connect nodes by dragging edges
  - Delete nodes/edges with keyboard or context menu
  - Zoom, pan, minimap
- Node configuration panel:
  - Opens when a node is clicked
  - Dynamic form fields based on node type and subtype
  - Trigger node: select type (manual, webhook, schedule)
  - AI node: prompt template editor, model selection, output schema
  - Action node: HTTP method, URL, headers, body template
- Save/Load:
  - Save serializes the React Flow state into the graph_data format and calls `POST /PUT /api/workflows`
  - Load deserializes and renders the graph
- Workflow list page (dashboard)
- Responsive design (but desktop-first — this is a power-user tool)

### Deliverable
Users can visually build, save, and load workflows.

---

## Phase 4 — Workflow Execution Engine

### Objective
Build the core engine that validates and orchestrates workflow execution.

### Tasks

- DAG validation:
  - Cycle detection using DFS
  - Validate all edges reference existing nodes
  - Validate trigger node exists and is a root (no incoming edges)
  - Validate template expressions reference valid upstream node IDs
- Topological sort (Kahn's algorithm)
- ExecutionContext class:
  - Stores trigger input and accumulated node outputs
  - Template resolver: takes a string with `{{ }}` expressions and resolves against context
- Execution orchestrator:
  - Creates a `WorkflowRun` record with status `pending`
  - Snapshots the workflow version
  - Dispatches to Celery (Phase 5)
- Manual trigger endpoint:
  - `POST /api/workflows/{id}/execute` validates, creates run, enqueues, returns 202

### Deliverable
Workflows can be validated and queued for execution.

---

## Phase 5 — Asynchronous Job Processing

### Objective
Execute workflows in background workers via Celery.

### Tasks

- Celery configuration:
  - Redis as broker and result backend
  - Task serialization with JSON
  - Concurrency: 2 workers (appropriate for t3.micro)
  - Task time limit: 5 minutes per workflow run
- Main Celery task: `execute_workflow_run(run_id)`
  - Fetch run and workflow from database
  - Build execution order via topological sort
  - Iterate through nodes sequentially:
    - Resolve input templates against ExecutionContext
    - Call the appropriate NodeExecutor
    - Store output in ExecutionContext
    - Write NodeExecutionLog to database
    - Publish status update to WebSocket (via Redis pub/sub)
  - Update run status on completion or failure
- Node executors (initial implementations):
  - `TriggerExecutor`: simply passes through the trigger input
  - `AINodeExecutor`: placeholder (implemented in Phase 6)
  - `HTTPActionExecutor`: placeholder (implemented in Phase 7)
- Graceful error handling:
  - Catch exceptions per node
  - Mark node as failed, log error
  - Determine if downstream nodes should be skipped

### Deliverable
Workflows execute asynchronously in the background with status tracking.

---

## Phase 6 — AI Task Integration

### Objective
Enable AI-powered workflow steps using a provider-agnostic interface.

### Tasks

- LLM provider interface:
  ```python
  class LLMProvider(ABC):
      @abstractmethod
      async def complete(self, prompt: str, config: LLMConfig) -> LLMResponse:
          pass
  ```
- Ollama provider (primary — free, local):
  - HTTP calls to Ollama's REST API (`POST /api/generate`)
  - Model selection: user picks from available models (mistral, llama3, etc.)
  - No API key required
- OpenAI provider (optional — BYOK):
  - Users can add their own API key in settings
  - Key stored encrypted in database
  - Used only when explicitly selected in node config
- AI node executor:
  - Resolves prompt template against ExecutionContext
  - Sends to configured LLM provider
  - Parses response (attempts JSON extraction if output_schema is defined)
  - Validates against output_schema if provided
  - Returns structured output
- AI node subtypes:
  - `summarize`: Summarization prompt template
  - `classify`: Classification with predefined categories
  - `extract`: Structured data extraction
  - `custom`: User writes their own prompt

### Deliverable
Workflows can include AI steps that process data through LLMs.

---

## Phase 7 — External Integrations

### Objective
Allow workflows to receive external triggers and send requests to external systems.

### Tasks

- Webhook trigger:
  - `POST /webhooks/{workflow_id}` — public endpoint (no auth required)
  - Validates workflow exists and is active
  - Checks concurrency policy before enqueuing
  - Stores raw request body as trigger input
  - Returns 202 with run ID
- HTTP action node executor:
  - Sends HTTP requests to configured URLs
  - Supports GET, POST, PUT, PATCH, DELETE
  - Template resolution in URL, headers, and body
  - Response handling: stores status code and response body as node output
  - Timeout: configurable, default 10 seconds
  - Retry with exponential backoff (1s, 2s, 4s — max 3 attempts)
- Security considerations:
  - Webhook endpoints are rate-limited (10 requests/minute per workflow)
  - HTTP action nodes do not allow requests to private IPs (SSRF prevention)
  - Webhook payloads are size-limited (1MB max)

### Deliverable
Workflows can be triggered externally and can call external APIs.

---

## Phase 8 — Real-Time Execution Updates

### Objective
Stream live workflow execution progress to the frontend.

### Tasks

- FastAPI WebSocket endpoint: `ws /ws/runs/{run_id}`
  - Authenticates via JWT passed as query parameter
  - Subscribes to Redis pub/sub channel `run:{run_id}`
- Worker publishes events:
  - On each node status change, publish to `run:{run_id}` channel
  - Event format matches the WebSocket message spec defined above
- Frontend WebSocket client:
  - Connects when user views a run
  - Updates UI in real time (node status badges, progress indicators)
  - Auto-reconnects on disconnect
  - Falls back to polling `GET /api/runs/{run_id}` every 3 seconds if WebSocket fails
- Run detail page:
  - Visual workflow graph with live status colors (grey=pending, blue=running, green=completed, red=failed)
  - Expandable log panel for each node
  - Duration timer

### Deliverable
Users see live progress as their workflows execute.

---

## Phase 9 — Logging, Monitoring, and History

### Objective
Provide comprehensive execution visibility.

### Tasks

- Run history page:
  - Paginated list of all runs for a workflow
  - Filterable by status, date range
  - Sortable by start time, duration
- Run detail view:
  - Full execution timeline
  - Per-node input/output inspection (collapsible JSON viewer)
  - Error details with stack traces (for failed nodes)
  - Duration breakdown per node
- Backend logging:
  - Structured JSON logging (using `structlog`)
  - Request ID tracking across API → Worker → WebSocket
  - Log levels: INFO for normal flow, ERROR for failures, DEBUG for detailed execution
- Health endpoints:
  - `GET /api/health` — basic liveness
  - `GET /api/health/ready` — checks DB + Redis connectivity

### Deliverable
Users can inspect any past execution in detail. System health is observable.

---

## Phase 10 — Reliability Features

### Objective
Ensure robust production behavior.

### Tasks

- Retry policies:
  - Configurable per node: `retry_count` (default: 3), `retry_delay_seconds` (default: 1)
  - Exponential backoff: delay × 2^(attempt - 1)
  - Maximum retry delay cap: 30 seconds
  - Each retry attempt is logged separately
- Idempotency:
  - Each node execution log includes an `attempt` number
  - HTTP action nodes include an `X-Idempotency-Key` header (`{run_id}:{node_id}:{attempt}`)
- Timeout handling:
  - Per-node timeout (configurable, default: 30s for AI, 10s for HTTP)
  - Per-run global timeout (5 minutes)
  - Celery soft_time_limit and time_limit configuration
- Dead run recovery:
  - Background scheduled task (Celery beat, runs every 5 minutes)
  - Finds runs stuck in `running` status for > 10 minutes
  - Marks them as `timed_out`
  - Logs the recovery action

### Deliverable
The system handles failures gracefully and recovers from stuck states.

---

## Phase 11 — Stripe Integration and Usage Tracking

### Objective
Implement usage-based billing with free and paid tiers.

### Plan Limits

| Feature              | Free Tier       | Pro Tier ($10/mo) |
|----------------------|-----------------|-------------------|
| Workflows            | 5               | Unlimited         |
| Runs per month       | 50              | 5,000             |
| AI node calls/month  | 30              | 2,000             |
| Webhook triggers     | Yes             | Yes               |
| Run history          | 7 days          | 90 days           |

### Tasks

- Stripe setup (test mode — no real charges):
  - Create Stripe account and configure test mode
  - Create Product and Price objects for Pro plan
  - Configure webhook endpoint for Stripe events
- Backend implementation:
  - `POST /api/billing/create-checkout-session` — creates Stripe Checkout session
  - `POST /api/billing/create-portal-session` — Stripe Customer Portal for managing subscription
  - `POST /api/stripe-webhook` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - `GET /api/billing/usage` — returns current usage against limits
- Usage tracking:
  - Before each workflow execution, check usage limits
  - Increment counters in Redis (fast) with periodic flush to PostgreSQL (durable)
  - Return 403 with clear message if limit exceeded
- Frontend:
  - Usage dashboard showing current consumption vs limits
  - Upgrade prompt when approaching limits
  - Settings page with billing management (links to Stripe Portal)

### Note on Free Tier Feasibility
Stripe test mode is completely free. No real charges are involved. The entire billing flow (checkout, subscription management, webhooks) works identically in test mode. This is industry-standard for portfolio projects.

### Deliverable
Working billing system with usage enforcement and Stripe integration.

---

## Phase 12 — Artifact Storage

### Objective
Store large node outputs and persistent artifacts in S3.

### Tasks

- S3 bucket setup with appropriate IAM policies
- When a node output exceeds 100KB:
  - Store the output in S3 as `{run_id}/{node_id}/output.json`
  - Store an S3 reference in the database instead of the full output
- Artifact retrieval endpoint:
  - `GET /api/artifacts/{artifact_id}` — generates pre-signed S3 URL (expires in 15 minutes)
- Frontend shows artifact download links for large outputs
- Cleanup policy: delete artifacts older than 30 days (background task)

### Note on Free Tier Feasibility
S3 free tier provides 5GB storage and 20,000 GET / 2,000 PUT requests per month. For a portfolio project this is more than sufficient. The cleanup policy ensures storage doesn't accumulate.

### Deliverable
Large execution outputs are stored in S3 and accessible via the UI.

---

## Phase 13 — Deployment to AWS

### Objective
Deploy the full system using free-tier infrastructure.

### Infrastructure

#### EC2 Instance (t3.micro — 1 vCPU, 1GB RAM)

Running via Docker Compose:
- FastAPI backend (uvicorn, 2 workers) — ~200MB RAM
- Celery worker (2 concurrency) — ~300MB RAM
- Redis (maxmemory 128MB) — ~150MB RAM
- Nginx reverse proxy — ~20MB RAM
- **Total: ~670MB** — tight but feasible on 1GB with swap enabled

**Important:** Ollama cannot run on t3.micro (LLMs require several GB of RAM). For deployed demos, the AI nodes should default to a free-tier external API or the BYOK OpenAI option. Local Ollama is for development only.

#### RDS PostgreSQL (db.t3.micro — 1 vCPU, 1GB RAM, 20GB storage)
- Managed database with automated backups
- Free tier: 750 hours/month for 12 months

#### S3
- Artifact storage bucket
- Free tier: 5GB storage, 20,000 GET, 2,000 PUT per month

### Deployment Steps

1. Launch EC2 instance, install Docker and Docker Compose
2. Set up RDS PostgreSQL, configure security group for EC2 access
3. Create S3 bucket with IAM credentials
4. Configure Nginx with SSL (Let's Encrypt / Certbot)
5. Set up environment variables on EC2
6. Deploy with `docker-compose -f docker-compose.prod.yml up -d`
7. Run Alembic migrations against RDS
8. Configure domain (optional, or use EC2 public IP)

### Feasibility Notes

- **EC2 free tier is 750 hours/month** for 12 months from account creation. A single instance running 24/7 uses ~720 hours/month — this works but leaves little room for other instances.
- **RDS free tier is also 750 hours/month** for 12 months. Same constraint.
- After 12 months, or if your student credits run out, shut down resources to avoid charges.
- **Memory is the main constraint.** Monitor with `htop` and `docker stats`. Enable 1GB swap file as a safety net.
- **No Ollama in production.** Use BYOK OpenAI or a free LLM API (Groq free tier, Google Gemini free tier) for deployed AI nodes.

### Deliverable
Fully deployed and accessible application on AWS.

---

## Phase 14 — Production Hardening

### Objective
Polish for public demonstration and portfolio presentation.

### Tasks

- Environment configuration:
  - Separate `.env.production` with all secrets
  - Never commit secrets to Git
- Security:
  - HTTPS everywhere (Nginx + Let's Encrypt)
  - CORS configuration (allow only frontend origin)
  - Rate limiting on public endpoints (webhook, auth)
  - Input validation on all endpoints (Pydantic handles this)
  - SQL injection prevention (SQLAlchemy parameterized queries)
- API documentation:
  - FastAPI auto-generates OpenAPI/Swagger docs at `/docs`
  - Add descriptions to all endpoints and schemas
- Frontend polish:
  - Error boundaries for graceful failure
  - Loading states and skeleton screens
  - Toast notifications for success/error
  - Empty states with helpful prompts
- Seed data:
  - Create 2-3 pre-built demo workflows (see Demo Scenarios below)
  - Seed script that populates a demo account
- README and documentation:
  - Project overview with architecture diagram
  - Local development setup guide
  - Deployment guide
  - API documentation link
  - Screenshots/GIFs of the application

### Deliverable
Production-ready application suitable for portfolio presentation and live demos.

---

## Demo Scenarios

These are pre-built workflows that demonstrate the platform's capabilities. They serve as both test cases during development and showcase material for interviews/portfolio.

### Demo 1: Support Ticket Classifier
**Trigger:** Webhook receives a JSON payload with a support message.
**AI Node:** Classifies the ticket into categories (bug, feature request, question) and assigns priority (high/medium/low). Generates a one-line summary.
**Action Node:** Sends a formatted Slack message to a channel with the classification, priority, and summary.

*Demonstrates: webhook trigger → AI processing → external API action*

### Demo 2: Content Summarizer Pipeline
**Trigger:** Manual trigger with a URL as input.
**Action Node 1:** HTTP GET request to fetch the web page content.
**AI Node:** Summarizes the content into 3 bullet points and extracts key topics.
**Action Node 2:** Sends the summary via a webhook to a configured endpoint (or logs it).

*Demonstrates: multi-step pipeline, data passing between nodes, AI summarization*

### Demo 3: Scheduled Data Monitor
**Trigger:** Scheduled (cron-based, e.g., every hour — simulated for demo).
**Action Node 1:** HTTP GET to a public API (e.g., weather API, stock API).
**AI Node:** Analyzes the data and determines if an alert condition is met (e.g., temperature > threshold).
**Action Node 2 (conditional):** If alert condition is true, send notification via webhook.

*Demonstrates: scheduled triggers, conditional logic, real-world API integration, AI decision-making*

---

# Completion Criteria

The project is considered production-ready when:

- Users can authenticate via Google OAuth
- Workflows can be created and edited visually in the drag-and-drop builder
- Workflows execute asynchronously via Celery workers
- AI task nodes process data through LLMs (Ollama locally, BYOK in production)
- External webhook triggers and HTTP action nodes work reliably
- Real-time execution updates stream via WebSocket
- Comprehensive logs and run history are accessible
- Usage tracking and Stripe billing integration function correctly
- The system is deployed and accessible on AWS free-tier infrastructure
- At least 2 demo workflows are pre-built and functional
- Documentation and README are complete

---

# Notes for Development

- Follow clean code and modular design principles throughout
- Maintain strict separation between API routes, business logic, and worker tasks
- Write meaningful commit messages (conventional commits: `feat:`, `fix:`, `refactor:`)
- Prioritize reliability and correctness over feature breadth
- Test critical paths: DAG execution, template resolution, retry logic
- Keep the copilot agent focused on one phase at a time — complete each phase before moving to the next
- When in doubt, choose the simpler implementation first and iterate
- Document architectural decisions in `docs/adr/` (Architecture Decision Records)

---

# End of Roadmap
