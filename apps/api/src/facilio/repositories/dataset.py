"""Dataset persistence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from facilio.models.dataset import Dataset
from facilio.models.version import DatasetVersion


def _dataset_options():
    return (
        selectinload(Dataset.current_version).selectinload(DatasetVersion.profile),
        selectinload(Dataset.versions),
    )


class DatasetRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, dataset: Dataset) -> Dataset:
        self.session.add(dataset)
        self.session.flush()
        return dataset

    def get(self, dataset_id: uuid.UUID) -> Dataset | None:
        stmt = (
            select(Dataset).options(*_dataset_options()).where(Dataset.id == dataset_id)
        )
        return self.session.scalar(stmt)

    def list_page(self, *, page: int, page_size: int) -> tuple[list[Dataset], int]:
        total = self.session.scalar(select(func.count()).select_from(Dataset)) or 0
        stmt: Select[tuple[Dataset]] = (
            select(Dataset)
            .options(*_dataset_options())
            .order_by(Dataset.created_at.desc(), Dataset.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list(self.session.scalars(stmt))
        return items, int(total)

    def count(self) -> int:
        return int(self.session.scalar(select(func.count()).select_from(Dataset)) or 0)

    def get_by_sample_key(self, sample_key: str) -> Dataset | None:
        stmt = (
            select(Dataset)
            .options(*_dataset_options())
            .where(Dataset.sample_key == sample_key)
        )
        return self.session.scalar(stmt)

    def names(self) -> set[str]:
        rows = self.session.scalars(select(Dataset.name)).all()
        return set(rows)

    def save(self, dataset: Dataset) -> Dataset:
        dataset.updated_at = datetime.now(UTC)
        self.session.add(dataset)
        self.session.flush()
        return dataset

    def delete(self, dataset: Dataset) -> None:
        self.session.delete(dataset)
        self.session.flush()
