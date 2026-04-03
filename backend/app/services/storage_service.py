# backend/app/services/storage_service.py

import json
from pathlib import Path

import structlog

from app.core.config import settings

logger = structlog.get_logger()

# Threshold: outputs larger than this go to S3/storage
ARTIFACT_SIZE_THRESHOLD = 100 * 1024  # 100KB

# Local fallback directory when S3 is not configured
LOCAL_ARTIFACT_DIR = Path("artifacts")


def is_s3_configured() -> bool:
    """Check if S3 credentials are configured."""
    return bool(
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.S3_BUCKET_NAME
    )


def should_store_as_artifact(output: dict) -> bool:
    """Check if a node output is large enough to store as an artifact."""
    try:
        size = len(json.dumps(output).encode("utf-8"))
        return size > ARTIFACT_SIZE_THRESHOLD
    except (TypeError, ValueError):
        return False


def upload_artifact(
    run_id: str,
    node_id: str,
    data: dict,
    content_type: str = "application/json",
) -> str:
    """
    Upload an artifact to S3 or local storage.

    Returns the artifact key/path for later retrieval.
    """
    key = f"artifacts/{run_id}/{node_id}/output.json"
    content = json.dumps(data, indent=2).encode("utf-8")

    if is_s3_configured():
        return _upload_to_s3(key, content, content_type)
    else:
        return _upload_to_local(key, content)


def get_artifact_url(key: str, expires_in: int = 900) -> str:
    """
    Get a URL to download an artifact.

    For S3: generates a pre-signed URL (expires in 15 minutes by default).
    For local: returns a relative API path.
    """
    if is_s3_configured():
        return _get_s3_presigned_url(key, expires_in)
    else:
        return f"/api/artifacts/download?key={key}"


def download_artifact(key: str) -> dict | None:
    """
    Download an artifact and return its contents as a dict.

    Returns None if the artifact is not found.
    """
    if is_s3_configured():
        return _download_from_s3(key)
    else:
        return _download_from_local(key)


def delete_artifact(key: str) -> bool:
    """Delete an artifact. Returns True if successful."""
    if is_s3_configured():
        return _delete_from_s3(key)
    else:
        return _delete_from_local(key)


def delete_run_artifacts(run_id: str) -> int:
    """
    Delete all artifacts for a workflow run.

    Returns the number of artifacts deleted.
    """
    prefix = f"artifacts/{run_id}/"

    if is_s3_configured():
        return _delete_s3_prefix(prefix)
    else:
        return _delete_local_prefix(prefix)


# --- S3 Implementation ---


def _get_s3_client():
    """Create a boto3 S3 client."""
    import boto3

    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


def _upload_to_s3(key: str, content: bytes, content_type: str) -> str:
    """Upload to S3 and return the key."""
    client = _get_s3_client()
    client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    logger.info("artifact_uploaded_s3", key=key, size=len(content))
    return key


def _get_s3_presigned_url(key: str, expires_in: int) -> str:
    """Generate a pre-signed URL for S3 download."""
    client = _get_s3_client()
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )
    return url


def _download_from_s3(key: str) -> dict | None:
    """Download from S3 and parse as JSON."""
    try:
        client = _get_s3_client()
        response = client.get_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
        )
        content = response["Body"].read().decode("utf-8")
        return json.loads(content)
    except Exception as e:
        logger.warning("artifact_download_failed_s3", key=key, error=str(e))
        return None


def _delete_from_s3(key: str) -> bool:
    """Delete a single object from S3."""
    try:
        client = _get_s3_client()
        client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        return True
    except Exception as e:
        logger.warning("artifact_delete_failed_s3", key=key, error=str(e))
        return False


def _delete_s3_prefix(prefix: str) -> int:
    """Delete all objects under a prefix in S3."""
    try:
        client = _get_s3_client()
        response = client.list_objects_v2(
            Bucket=settings.S3_BUCKET_NAME,
            Prefix=prefix,
        )
        objects = response.get("Contents", [])
        if not objects:
            return 0

        delete_request = {"Objects": [{"Key": obj["Key"]} for obj in objects]}
        client.delete_objects(
            Bucket=settings.S3_BUCKET_NAME,
            Delete=delete_request,
        )
        return len(objects)
    except Exception as e:
        logger.warning("artifact_prefix_delete_failed_s3", prefix=prefix, error=str(e))
        return 0


# --- Local Filesystem Implementation (development fallback) ---


def _upload_to_local(key: str, content: bytes) -> str:
    """Upload to local filesystem."""
    path = LOCAL_ARTIFACT_DIR / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    logger.info("artifact_uploaded_local", key=key, size=len(content))
    return key


def _download_from_local(key: str) -> dict | None:
    """Download from local filesystem."""
    try:
        path = LOCAL_ARTIFACT_DIR / key
        if not path.exists():
            return None
        content = path.read_text(encoding="utf-8")
        return json.loads(content)
    except Exception as e:
        logger.warning("artifact_download_failed_local", key=key, error=str(e))
        return None


def _delete_from_local(key: str) -> bool:
    """Delete from local filesystem."""
    try:
        path = LOCAL_ARTIFACT_DIR / key
        if path.exists():
            path.unlink()
            return True
        return False
    except Exception as e:
        logger.warning("artifact_delete_failed_local", key=key, error=str(e))
        return False


def _delete_local_prefix(prefix: str) -> int:
    """Delete all files under a prefix in local storage."""
    try:
        path = LOCAL_ARTIFACT_DIR / prefix
        if not path.exists():
            return 0
        count = 0
        for file in path.rglob("*"):
            if file.is_file():
                file.unlink()
                count += 1
        # Remove empty directories
        for dir_path in sorted(path.rglob("*"), reverse=True):
            if dir_path.is_dir():
                try:
                    dir_path.rmdir()
                except OSError:
                    pass
        try:
            path.rmdir()
        except OSError:
            pass
        return count
    except Exception as e:
        logger.warning(
            "artifact_prefix_delete_failed_local", prefix=prefix, error=str(e)
        )
        return 0
