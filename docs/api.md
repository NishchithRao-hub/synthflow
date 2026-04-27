# API and WebSocket Guide

## API Base URL

- Local: http://localhost:8000
- Production: https://<your-domain>

## Interactive API Docs

- Swagger UI: /docs
- ReDoc: /redoc
- OpenAPI schema: /openapi.json

## Authentication Model

Most endpoints require a Bearer access token.

Typical flow:

1. Authenticate with Google or email/password route
2. Receive access + refresh tokens
3. Send Authorization: Bearer <access_token>
4. Refresh when access token expires

## Endpoint Catalog

### Auth (/api/auth)

- POST /api/auth/google
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/verify-email
- POST /api/auth/resend-verification
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me
- DELETE /api/auth/me

### Workflows (/api/workflows)

- POST /api/workflows/
- GET /api/workflows/
- GET /api/workflows/{workflow_id}
- PUT /api/workflows/{workflow_id}
- DELETE /api/workflows/{workflow_id}

### Execution (/api)

- POST /api/workflows/{workflow_id}/execute
- GET /api/runs/{run_id}
- GET /api/workflows/{workflow_id}/runs

### Billing (/api/billing)

- GET /api/billing/usage
- POST /api/billing/create-checkout-session
- POST /api/billing/create-portal-session
- POST /api/billing/sync-subscription
- POST /api/billing/stripe-webhook

### Settings (/api/settings)

- GET /api/settings/api-keys
- PUT /api/settings/api-keys/openai
- DELETE /api/settings/api-keys/openai

### Artifacts (/api/artifacts)

- GET /api/artifacts/url
- GET /api/artifacts/download
- GET /api/artifacts/{run_id}

### Webhooks (/webhooks)

- POST /webhooks/{workflow_id}

### Health

- GET /
- GET /api/health
- GET /api/health/ready

## WebSocket: Real-Time Run Monitoring

Endpoint pattern:

- ws://localhost:8000/ws/runs/{run_id}?token={jwt}
- wss://<your-domain>/ws/runs/{run_id}?token={jwt}

Event families you can expect:

- run_started
- node_status_update
- run_completed
- run_failed
- ping (keepalive)

## Sample Requests

### Trigger Workflow Run

```bash
curl -X POST "http://localhost:8000/api/workflows/<workflow_id>/execute" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"input": {"message": "hello"}}'
```

### Get Run Details

```bash
curl "http://localhost:8000/api/runs/<run_id>" \
  -H "Authorization: Bearer <access_token>"
```

### Get Usage

```bash
curl "http://localhost:8000/api/billing/usage" \
  -H "Authorization: Bearer <access_token>"
```

## Error Handling Notes

- Validation and business errors use structured JSON response format
- Usage-limit violations return clear 403 responses
- Health/readiness endpoints help classify infra vs app-level failures

## API Image Placeholders

- Swagger screenshot: assets/api-swagger.png
- ReDoc screenshot: assets/api-redoc.png
