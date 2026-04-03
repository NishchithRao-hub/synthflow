# backend/app/routers/artifacts.py

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.user import User
from app.services.storage_service import (
    download_artifact,
    get_artifact_url,
    is_s3_configured,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/artifacts", tags=["Artifacts"])


@router.get("/url")
async def get_artifact_download_url(
    key: str = Query(
        description="Artifact key (e.g., artifacts/run_id/node_id/output.json)"
    ),
    current_user: User = Depends(get_current_user),
):
    """
    Get a download URL for an artifact.

    For S3: returns a pre-signed URL (valid for 15 minutes).
    For local storage: returns a direct download URL.
    """
    if not key or not key.startswith("artifacts/"):
        raise BadRequestException("Invalid artifact key")

    # Verify the artifact exists
    # Extract run_id from key to verify ownership (artifacts/run_id/node_id/output.json)
    parts = key.split("/")
    if len(parts) < 3:
        raise BadRequestException("Invalid artifact key format")

    url = get_artifact_url(key, expires_in=900)

    logger.info(
        "artifact_url_generated",
        key=key,
        user_id=current_user.id,
        is_s3=is_s3_configured(),
    )

    return {"download_url": url, "expires_in": 900}


@router.get("/download")
async def download_artifact_direct(
    key: str = Query(description="Artifact key"),
    current_user: User = Depends(get_current_user),
):
    """
    Download an artifact directly.

    Used as fallback when S3 pre-signed URLs aren't available
    (local development). Returns the artifact content as JSON.
    """
    if not key or not key.startswith("artifacts/"):
        raise BadRequestException("Invalid artifact key")

    data = download_artifact(key)
    if data is None:
        raise NotFoundException("Artifact", key)

    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="{key.split("/")[-1]}"',
        },
    )


@router.get("/{run_id}")
async def list_run_artifacts(
    run_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    List all artifacts for a workflow run.

    Checks the run's node execution logs for artifact references
    and returns download URLs for each.
    """
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.models.node_execution_log import NodeExecutionLog
    from app.models.workflow import Workflow
    from app.models.workflow_run import WorkflowRun

    async with async_session_factory() as db:
        # Verify run exists and user has access
        run = (
            await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        ).scalar_one_or_none()

        if not run:
            raise NotFoundException("WorkflowRun", run_id)

        # Verify ownership
        workflow = (
            await db.execute(select(Workflow).where(Workflow.id == run.workflow_id))
        ).scalar_one_or_none()

        if workflow and workflow.owner_id != current_user.id:
            from app.core.exceptions import ForbiddenException

            raise ForbiddenException()

        # Find nodes with artifact outputs
        logs = (
            (
                await db.execute(
                    select(NodeExecutionLog)
                    .where(NodeExecutionLog.run_id == run_id)
                    .order_by(NodeExecutionLog.created_at.asc())
                )
            )
            .scalars()
            .all()
        )

        artifacts = []
        for log in logs:
            if isinstance(log.output, dict) and log.output.get("_artifact"):
                artifact_key = log.output.get("_artifact_key", "")
                artifacts.append(
                    {
                        "node_id": log.node_id,
                        "node_type": log.node_type,
                        "artifact_key": artifact_key,
                        "size_bytes": log.output.get("_original_size_bytes"),
                        "download_url": get_artifact_url(artifact_key),
                    }
                )

    return {
        "run_id": run_id,
        "artifacts": artifacts,
        "total": len(artifacts),
    }
