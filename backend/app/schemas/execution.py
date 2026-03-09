# backend/app/schemas/execution.py

from datetime import datetime

from pydantic import BaseModel, Field

# --- Request schemas ---


class ExecuteWorkflowRequest(BaseModel):
    input: dict = Field(
        default_factory=dict,
        description="Input data passed to the trigger node",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "input": {
                    "message": "The app crashes when I try to log in on iOS",
                    "user_email": "customer@example.com",
                }
            }
        }
    }


# --- Response schemas ---


class ExecuteWorkflowResponse(BaseModel):
    run_id: str
    workflow_id: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class NodeStatusResponse(BaseModel):
    status: str
    duration_ms: int | None = None
    output: dict | None = None
    error: str | None = None
    attempt: int = 1


class RunDetailResponse(BaseModel):
    run_id: str
    workflow_id: str
    workflow_version: int
    status: str
    trigger_type: str
    trigger_input: dict | None = None
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: int | None = None
    node_statuses: dict[str, NodeStatusResponse] = Field(default_factory=dict)
    execution_context: dict = Field(default_factory=dict)


class RunListItem(BaseModel):
    id: str
    workflow_id: str
    status: str
    trigger_type: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RunListResponse(BaseModel):
    runs: list[RunListItem]
    total: int
    page: int
    per_page: int
