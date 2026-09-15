"""Profile persistence."""

from __future__ import annotations

import uuid

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from facilio.models.profile import DatasetProfile, QualityIssue


class ProfileRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_for_version(self, version_id: uuid.UUID) -> DatasetProfile | None:
        stmt: Select[tuple[DatasetProfile]] = (
            select(DatasetProfile)
            .options(
                selectinload(DatasetProfile.columns),
                selectinload(DatasetProfile.issues),
            )
            .where(DatasetProfile.version_id == version_id)
        )
        return self.session.scalar(stmt)

    def get_for_dataset(self, dataset_id: uuid.UUID) -> DatasetProfile | None:
        from facilio.models.dataset import Dataset

        dataset = self.session.get(Dataset, dataset_id)
        if dataset is None or dataset.current_version_id is None:
            return None
        return self.get_for_version(dataset.current_version_id)

    def add(self, profile: DatasetProfile) -> DatasetProfile:
        self.session.add(profile)
        self.session.flush()
        return profile

    def delete(self, profile: DatasetProfile) -> None:
        self.session.delete(profile)
        self.session.flush()

    def list_ready_current(self) -> list[DatasetProfile]:
        from facilio.models.dataset import Dataset

        stmt = (
            select(DatasetProfile)
            .join(Dataset, Dataset.current_version_id == DatasetProfile.version_id)
            .where(DatasetProfile.status == "READY")
            .order_by(DatasetProfile.profiled_at.desc())
        )
        return list(self.session.scalars(stmt))

    def count_current_by_status(self) -> dict[str, int]:
        from facilio.models.dataset import Dataset

        rows = self.session.execute(
            select(DatasetProfile.status, func.count())
            .join(Dataset, Dataset.current_version_id == DatasetProfile.version_id)
            .group_by(DatasetProfile.status)
        ).all()
        return {str(status): int(count) for status, count in rows}


_SEVERITY_RANK = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}


def issue_sort_key(issue: QualityIssue) -> tuple[int, float, str, str]:
    rank = _SEVERITY_RANK.get(issue.severity, 9)
    pct = issue.affected_percentage if issue.affected_percentage is not None else -1.0
    column = issue.column_name or ""
    return (rank, -pct, column, issue.code)
