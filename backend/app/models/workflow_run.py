from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.node_execution_log import NodeExecutionLog
    from app.models.workflow import Workflow


class WorkflowRun(Base, TimestampMixin):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    workflow_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workflows.id", ondelete="CASCADE"), index=True
    )
    workflow_version: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    trigger_type: Mapped[str] = mapped_column(String(50))
    trigger_input: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    execution_context: Mapped[dict] = mapped_column(JSONB, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    workflow_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="runs")
    node_logs: Mapped[list["NodeExecutionLog"]] = relationship(
        "NodeExecutionLog",
        back_populates="run",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<WorkflowRun {self.id} status={self.status}>"
