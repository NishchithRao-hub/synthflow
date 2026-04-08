# backend/app/routers/workflows.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowCreateResponse,
    WorkflowListItem,
    WorkflowListResponse,
    WorkflowResponse,
    WorkflowUpdate,
)
from app.services import workflow_service

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


@router.post("", response_model=WorkflowCreateResponse, status_code=201)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new workflow.

    The workflow starts with an empty graph. Use the visual builder
    or the update endpoint to add nodes and edges.

    **Plan limits apply:** Free tier allows up to 5 workflows.
    """

    # Check workflow creation limit
    from app.services import usage_service

    can_create, error_msg = await usage_service.check_can_create_workflow(
        db, current_user.id
    )
    if not can_create:
        from app.core.exceptions import UsageLimitExceededException

        raise UsageLimitExceededException("workflows", 0)

    workflow = await workflow_service.create_workflow(db, current_user.id, data)

    return WorkflowCreateResponse(
        id=workflow.id,
        name=workflow.name,
        webhook_url=f"{settings.BACKEND_URL}/webhooks/{workflow.id}",
        created_at=workflow.created_at,
    )


@router.get("", response_model=WorkflowListResponse)
async def list_workflows(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all workflows for the authenticated user.

    Returns a paginated list sorted by creation date (newest first).
    """
    workflows, total = await workflow_service.get_workflows(
        db, current_user.id, page, per_page
    )

    items = []
    for wf in workflows:
        graph = wf.graph_data or {}
        node_count = len(graph.get("nodes", []))
        items.append(
            WorkflowListItem(
                id=wf.id,
                name=wf.name,
                description=wf.description,
                is_active=wf.is_active,
                node_count=node_count,
                version=wf.version,
                created_at=wf.created_at,
                updated_at=wf.updated_at,
            )
        )

    return WorkflowListResponse(
        workflows=items, total=total, page=page, per_page=per_page
    )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a workflow by ID.

    Returns the full workflow definition including the graph data
    (nodes, edges, and their configurations).
    """
    workflow = await workflow_service.get_workflow_by_id(
        db, workflow_id, current_user.id
    )
    return WorkflowResponse.model_validate(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a workflow.

    Supports partial updates — only include the fields you want to change.
    The version number is automatically incremented on each update.
    """
    workflow = await workflow_service.update_workflow(
        db, workflow_id, current_user.id, data
    )
    return WorkflowResponse.model_validate(workflow)


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a manual workflow execution.

    Validates the workflow graph, checks usage limits, creates a run record,
    and enqueues it for asynchronous execution via Celery.

    Returns **202 Accepted** immediately. Poll `GET /api/runs/{run_id}`
    or connect via WebSocket for real-time status updates.

    **Plan limits apply:** Free tier allows 50 runs per month.
    """
    await workflow_service.delete_workflow(db, workflow_id, current_user.id)
    return None
