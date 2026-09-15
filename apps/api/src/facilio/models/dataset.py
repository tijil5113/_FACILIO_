"""Dataset persistence model.

PostgreSQL stores dataset metadata only. The uploaded source file lives in
managed storage and is never mutated by ingestion.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, Uuid

from facilio.db.base import Base

if TYPE_CHECKING:
    from facilio.models.version import DatasetVersion, Transformation


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ready")
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    column_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    selected_sheet: Mapped[str | None] = mapped_column(String(256), nullable=True)
    encoding: Mapped[str | None] = mapped_column(String(64), nullable=True)
    delimiter: Mapped[str | None] = mapped_column(String(8), nullable=True)
    columns_json: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, nullable=True
    )
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    is_sample: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sample_key: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True
    )
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "dataset_versions.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_datasets_current_version",
        ),
        nullable=True,
    )
    versions: Mapped[list[DatasetVersion]] = relationship(
        back_populates="dataset",
        foreign_keys="DatasetVersion.dataset_id",
        cascade="all, delete-orphan",
    )
    transformations: Mapped[list[Transformation]] = relationship(
        cascade="all, delete-orphan",
        foreign_keys="Transformation.dataset_id",
    )
    current_version: Mapped[DatasetVersion | None] = relationship(
        foreign_keys=[current_version_id],
        post_update=True,
    )
