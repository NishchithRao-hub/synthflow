from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workflow_run import WorkflowRun


class Workflow(Base, TimestampMixin):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    graph_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Concurrency behavior for workflow runs. Valid values:
    # - "allow_parallel": allow multiple runs of the same workflow to execute in parallel.
    # - "queue": queue new runs until the current run finishes.
    # - "cancel_existing": cancel any existing in-progress run when a new run starts.
    concurrency_policy: Mapped[str] = mapped_column(
        String(50), default="allow_parallel"
    )
    version: Mapped[int] = mapped_column(Integer, default=1)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="workflows")
    runs: Mapped[list["WorkflowRun"]] = relationship(
        "WorkflowRun", back_populates="workflow", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Workflow {self.name}>"
