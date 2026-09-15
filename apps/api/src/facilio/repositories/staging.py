"""Staging upload persistence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from facilio.models.staging import StagingUpload

STAGING_TTL = timedelta(hours=24)


class StagingRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, staging: StagingUpload) -> StagingUpload:
        self.session.add(staging)
        self.session.flush()
        return staging

    def get(self, staging_id: uuid.UUID) -> StagingUpload | None:
        return self.session.get(StagingUpload, staging_id)

    def delete(self, staging: StagingUpload) -> None:
        self.session.delete(staging)
        self.session.flush()

    def expired(self) -> list[StagingUpload]:
        cutoff = datetime.now(UTC) - STAGING_TTL
        stmt = select(StagingUpload).where(StagingUpload.created_at < cutoff)
        return list(self.session.scalars(stmt))
