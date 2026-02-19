from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class NodeExecutionLog(Base, TimestampMixin):
    __tablename__ = "node_execution_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("workflow_runs.id", ondelete="CASCADE"),
        index=True,
    )
    node_id: Mapped[str] = mapped_column(String(255))
    node_type: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    input: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    output: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    run: Mapped["WorkflowRun"] = relationship("WorkflowRun", back_populates="node_logs")

    def __repr__(self) -> str:
        return f"<NodeExecutionLog {self.node_id} status={self.status}>"
