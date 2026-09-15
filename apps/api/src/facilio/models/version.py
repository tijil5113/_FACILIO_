"""Immutable dataset versions and applied transformation records."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from facilio.db.base import Base

if TYPE_CHECKING:
    from facilio.models.dataset import Dataset
    from facilio.models.profile import DatasetProfile
    from facilio.models.workflow import WorkflowRun


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    __table_args__ = (
        UniqueConstraint(
            "dataset_id", "version_number", name="uq_dataset_versions_number"
        ),
        UniqueConstraint(
            "created_by_workflow_run_id",
            name="uq_dataset_versions_workflow_run",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_version_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("dataset_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_format: Mapped[str] = mapped_column(String(32), nullable=False)
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    column_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    columns_json: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, nullable=True
    )
    label: Mapped[str] = mapped_column(String(256), nullable=False)
    profile_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="NOT_PROFILED"
    )
    profiled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    created_by_transformation_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), nullable=True
    )
    created_by_workflow_run_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "workflow_runs.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_dataset_versions_workflow_run",
        ),
        nullable=True,
    )

    dataset: Mapped[Dataset] = relationship(
        back_populates="versions",
        foreign_keys=[dataset_id],
    )
    parent: Mapped[DatasetVersion | None] = relationship(
        remote_side="DatasetVersion.id",
        foreign_keys=[parent_version_id],
    )
    profile: Mapped[DatasetProfile | None] = relationship(
        back_populates="version",
        uselist=False,
        cascade="all, delete-orphan",
    )
    outgoing_transformation: Mapped[Transformation | None] = relationship(
        back_populates="output_version",
        uselist=False,
        foreign_keys="Transformation.output_version_id",
    )
    created_by_workflow_run: Mapped[WorkflowRun | None] = relationship(
        foreign_keys=[created_by_workflow_run_id],
    )


class Transformation(Base):
    __tablename__ = "transformations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
    )
    input_version_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("dataset_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    output_version_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("dataset_versions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    operation_code: Mapped[str] = mapped_column(String(64), nullable=False)
    parameters_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    impact_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    extra_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    output_version: Mapped[DatasetVersion] = relationship(
        back_populates="outgoing_transformation",
        foreign_keys=[output_version_id],
    )
