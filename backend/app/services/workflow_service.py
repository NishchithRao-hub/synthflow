# backend/app/services/workflow_service.py

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.workflow import Workflow
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate


async def create_workflow(
    db: AsyncSession, owner_id: str, data: WorkflowCreate
) -> Workflow:
    workflow = Workflow(
        owner_id=owner_id,
        name=data.name,
        description=data.description,
        graph_data=data.graph_data.model_dump(),
        concurrency_policy=data.concurrency_policy,
    )
    db.add(workflow)
    await db.flush()
    await db.refresh(workflow)
    return workflow


async def get_workflows(
    db: AsyncSession, owner_id: str, page: int = 1, per_page: int = 20
) -> tuple[list[Workflow], int]:
    # Count total
    count_query = (
        select(func.count()).select_from(Workflow).where(Workflow.owner_id == owner_id)
    )
    result = await db.execute(count_query)
    total = result.scalar_one()

    # Fetch page
    offset = (page - 1) * per_page
    query = (
        select(Workflow)
        .where(Workflow.owner_id == owner_id)
        .order_by(Workflow.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    result = await db.execute(query)
    workflows = list(result.scalars().all())

    return workflows, total


async def get_workflow_by_id(
    db: AsyncSession, workflow_id: str, owner_id: str
) -> Workflow:
    query = select(Workflow).where(Workflow.id == workflow_id)
    result = await db.execute(query)
    workflow = result.scalar_one_or_none()

    if workflow is None:
        raise NotFoundException("Workflow", workflow_id)

    if workflow.owner_id != owner_id:
        raise ForbiddenException()

    return workflow


async def update_workflow(
    db: AsyncSession, workflow_id: str, owner_id: str, data: WorkflowUpdate
) -> Workflow:
    workflow = await get_workflow_by_id(db, workflow_id, owner_id)

    update_data = data.model_dump(exclude_unset=True)

    # Convert graph_data from Pydantic model to dict if present
    if "graph_data" in update_data and data.graph_data is not None:
        update_data["graph_data"] = data.graph_data.model_dump()

    for field, value in update_data.items():
        setattr(workflow, field, value)

    # Increment version on every save
    workflow.version += 1

    await db.flush()
    await db.refresh(workflow)
    return workflow


async def delete_workflow(db: AsyncSession, workflow_id: str, owner_id: str) -> None:
    workflow = await get_workflow_by_id(db, workflow_id, owner_id)
    await db.delete(workflow)
    await db.flush()
