# backend/app/routers/workflows.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
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

# Temporary: hardcoded user ID until we implement auth in Phase 2.
# This will be replaced with a proper dependency that extracts user from JWT.
TEMP_USER_ID = "temp-user-001"


@router.post("", response_model=WorkflowCreateResponse, status_code=201)
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
):
    workflow = await workflow_service.create_workflow(db, TEMP_USER_ID, data)
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
    db: AsyncSession = Depends(get_db),
):
    workflows, total = await workflow_service.get_workflows(
        db, TEMP_USER_ID, page, per_page
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
    db: AsyncSession = Depends(get_db),
):
    workflow = await workflow_service.get_workflow_by_id(db, workflow_id, TEMP_USER_ID)
    return WorkflowResponse.model_validate(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
):
    workflow = await workflow_service.update_workflow(
        db, workflow_id, TEMP_USER_ID, data
    )
    return WorkflowResponse.model_validate(workflow)


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
):
    await workflow_service.delete_workflow(db, workflow_id, TEMP_USER_ID)
    return None
