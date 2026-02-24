# backend/app/schemas/workflow.py

from datetime import datetime

from pydantic import BaseModel, Field

# --- Node and Edge schemas (for graph_data) ---


class NodePosition(BaseModel):
    x: float
    y: float


class WorkflowNode(BaseModel):
    id: str
    type: str = Field(description="trigger | ai | action")
    subtype: str | None = Field(
        default=None, description="e.g., webhook, classify, http_request"
    )
    config: dict = Field(default_factory=dict)
    position: NodePosition


class WorkflowEdge(BaseModel):
    source: str
    target: str


class GraphData(BaseModel):
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)


# --- Request schemas ---


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    graph_data: GraphData = Field(default_factory=GraphData)
    concurrency_policy: str = Field(default="allow_parallel")

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Support Ticket Classifier",
                "description": "Classifies incoming tickets and routes to Slack",
                "graph_data": {
                    "nodes": [
                        {
                            "id": "node_1",
                            "type": "trigger",
                            "subtype": "webhook",
                            "config": {},
                            "position": {"x": 100, "y": 200},
                        }
                    ],
                    "edges": [],
                },
                "concurrency_policy": "allow_parallel",
            }
        }
    }


class WorkflowUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    graph_data: GraphData | None = None
    is_active: bool | None = None
    concurrency_policy: str | None = None


# --- Response schemas ---


class WorkflowResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    description: str | None
    graph_data: dict
    is_active: bool
    concurrency_policy: str
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowListItem(BaseModel):
    id: str
    name: str
    description: str | None
    is_active: bool
    node_count: int
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowListResponse(BaseModel):
    workflows: list[WorkflowListItem]
    total: int
    page: int
    per_page: int


class WorkflowCreateResponse(BaseModel):
    id: str
    name: str
    webhook_url: str
    created_at: datetime

    model_config = {"from_attributes": True}
