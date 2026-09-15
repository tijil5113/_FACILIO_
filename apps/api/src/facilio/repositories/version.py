"""Dataset version persistence."""

from __future__ import annotations

import uuid

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from facilio.models.version import DatasetVersion, Transformation


class VersionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, version: DatasetVersion) -> DatasetVersion:
        self.session.add(version)
        self.session.flush()
        return version

    def get(self, version_id: uuid.UUID) -> DatasetVersion | None:
        stmt = (
            select(DatasetVersion)
            .options(
                selectinload(DatasetVersion.profile),
                selectinload(DatasetVersion.outgoing_transformation),
                selectinload(DatasetVersion.created_by_workflow_run),
            )
            .where(DatasetVersion.id == version_id)
        )
        return self.session.scalar(stmt)

    def get_for_dataset(
        self, dataset_id: uuid.UUID, version_id: uuid.UUID
    ) -> DatasetVersion | None:
        stmt = (
            select(DatasetVersion)
            .options(
                selectinload(DatasetVersion.profile),
                selectinload(DatasetVersion.outgoing_transformation),
                selectinload(DatasetVersion.created_by_workflow_run),
            )
            .where(
                DatasetVersion.id == version_id,
                DatasetVersion.dataset_id == dataset_id,
            )
        )
        return self.session.scalar(stmt)

    def list_for_dataset(self, dataset_id: uuid.UUID) -> list[DatasetVersion]:
        stmt: Select[tuple[DatasetVersion]] = (
            select(DatasetVersion)
            .options(
                selectinload(DatasetVersion.profile),
                selectinload(DatasetVersion.outgoing_transformation),
                selectinload(DatasetVersion.created_by_workflow_run),
            )
            .where(DatasetVersion.dataset_id == dataset_id)
            .order_by(DatasetVersion.version_number.asc())
        )
        return list(self.session.scalars(stmt))

    def next_version_number(self, dataset_id: uuid.UUID) -> int:
        current = self.session.scalar(
            select(func.max(DatasetVersion.version_number)).where(
                DatasetVersion.dataset_id == dataset_id
            )
        )
        return int(current or 0) + 1

    def count_derived(self) -> int:
        return int(
            self.session.scalar(
                select(func.count()).where(DatasetVersion.kind == "DERIVED")
            )
            or 0
        )


class TransformationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, row: Transformation) -> Transformation:
        self.session.add(row)
        self.session.flush()
        return row

    def list_for_dataset(self, dataset_id: uuid.UUID) -> list[Transformation]:
        stmt = (
            select(Transformation)
            .where(Transformation.dataset_id == dataset_id)
            .order_by(Transformation.created_at.asc())
        )
        return list(self.session.scalars(stmt))

    def get_by_output(self, output_version_id: uuid.UUID) -> Transformation | None:
        stmt = select(Transformation).where(
            Transformation.output_version_id == output_version_id
        )
        return self.session.scalar(stmt)

    def count(self) -> int:
        return int(
            self.session.scalar(select(func.count()).select_from(Transformation)) or 0
        )
