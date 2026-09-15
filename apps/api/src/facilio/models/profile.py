"""Persisted dataset profile snapshots.

One current profile per dataset version. Re-profiling a version replaces that
version's snapshot only. Source files are never stored here.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from facilio.db.base import Base

if TYPE_CHECKING:
    from facilio.models.dataset import Dataset
    from facilio.models.version import DatasetVersion


class DatasetProfile(Base):
    __tablename__ = "dataset_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
    )
    version_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("dataset_versions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    profile_version: Mapped[str] = mapped_column(String(32), nullable=False)
    stale: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    profiled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    quality_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(32), nullable=True)
    issue_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    columns: Mapped[list[ColumnProfile]] = relationship(
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="ColumnProfile.position",
    )
    issues: Mapped[list[QualityIssue]] = relationship(
        back_populates="profile",
        cascade="all, delete-orphan",
    )
    dataset: Mapped[Dataset] = relationship()
    version: Mapped[DatasetVersion] = relationship(back_populates="profile")


class ColumnProfile(Base):
    __tablename__ = "column_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("dataset_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    detected_type: Mapped[str] = mapped_column(String(32), nullable=False)
    ingestion_dtype: Mapped[str | None] = mapped_column(String(32), nullable=True)
    semantic_hint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cardinality: Mapped[str] = mapped_column(String(32), nullable=False)
    issue_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stats_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    profile: Mapped[DatasetProfile] = relationship(back_populates="columns")


class QualityIssue(Base):
    __tablename__ = "quality_issues"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("dataset_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    issue_key: Mapped[str] = mapped_column(String(256), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    column_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    affected_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    affected_percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_json: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    suggested_action: Mapped[str] = mapped_column(Text, nullable=False)

    profile: Mapped[DatasetProfile] = relationship(back_populates="issues")
