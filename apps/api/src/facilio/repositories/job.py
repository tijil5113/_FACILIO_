"""Job persistence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, selectinload

from facilio.models.dataset import Dataset
from facilio.models.job import Job, JobAttempt, WorkerHeartbeat
from facilio.models.workflow import Workflow


class JobRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, job: Job) -> Job:
        self.session.add(job)
        self.session.flush()
        return job

    def get(self, job_id: uuid.UUID) -> Job | None:
        stmt = (
            select(Job)
            .options(
                selectinload(Job.attempts),
                selectinload(Job.workflow_run),
            )
            .where(Job.id == job_id)
        )
        return self.session.scalar(stmt)

    def get_for_update(self, job_id: uuid.UUID) -> Job | None:
        stmt = (
            select(Job)
            .options(selectinload(Job.attempts), selectinload(Job.workflow_run))
            .where(Job.id == job_id)
            .with_for_update()
        )
        return self.session.scalar(stmt)

    def list_page(
        self,
        *,
        page: int,
        page_size: int,
        status: str | None = None,
        job_type: str | None = None,
        workflow_id: uuid.UUID | None = None,
        dataset_id: uuid.UUID | None = None,
        search: str | None = None,
    ) -> tuple[list[Job], int]:
        filters = []
        if status is not None:
            filters.append(Job.status == status)
        if job_type is not None:
            filters.append(Job.job_type == job_type)
        if workflow_id is not None:
            filters.append(Job.workflow_id == workflow_id)
        if dataset_id is not None:
            filters.append(Job.dataset_id == dataset_id)
        if search:
            needle = search.strip().lower()
            hex_prefix = needle.replace("-", "")
            filters.append(
                or_(
                    func.lower(cast(Job.id, String)).like(f"{hex_prefix}%"),
                    func.lower(cast(Job.id, String)).like(f"%{needle}%"),
                    Job.workflow_id.in_(
                        select(Workflow.id).where(
                            func.lower(Workflow.name).like(f"%{needle}%")
                        )
                    ),
                    Job.dataset_id.in_(
                        select(Dataset.id).where(
                            func.lower(Dataset.name).like(f"%{needle}%")
                        )
                    ),
                )
            )
        total = (
            self.session.scalar(select(func.count()).select_from(Job).where(*filters))
            or 0
        )
        stmt = (
            select(Job)
            .options(selectinload(Job.attempts), selectinload(Job.workflow_run))
            .where(*filters)
            .order_by(Job.created_at.desc(), Job.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.session.scalars(stmt)), int(total)

    def count_by_status(self, status: str) -> int:
        return int(
            self.session.scalar(select(func.count()).where(Job.status == status)) or 0
        )

    def stale_running(self, threshold: datetime) -> list[Job]:
        stmt = (
            select(Job)
            .options(selectinload(Job.attempts), selectinload(Job.workflow_run))
            .where(
                Job.status.in_(("RUNNING", "CANCEL_REQUESTED")),
                Job.heartbeat_at.is_not(None),
                Job.heartbeat_at < threshold,
            )
        )
        return list(self.session.scalars(stmt))

    def save(self, job: Job) -> Job:
        job.updated_at = datetime.now(UTC)
        self.session.add(job)
        self.session.flush()
        return job


class JobAttemptRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, attempt: JobAttempt) -> JobAttempt:
        self.session.add(attempt)
        self.session.flush()
        return attempt


class WorkerHeartbeatRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def upsert(self, worker_id: str, *, status: str = "AVAILABLE") -> WorkerHeartbeat:
        row = self.session.get(WorkerHeartbeat, worker_id)
        now = datetime.now(UTC)
        if row is None:
            row = WorkerHeartbeat(
                worker_id=worker_id, started_at=now, last_seen_at=now, status=status
            )
            self.session.add(row)
        else:
            row.last_seen_at = now
            row.status = status
        self.session.flush()
        return row

    def latest(self) -> WorkerHeartbeat | None:
        stmt = (
            select(WorkerHeartbeat)
            .order_by(WorkerHeartbeat.last_seen_at.desc())
            .limit(1)
        )
        return self.session.scalar(stmt)

    def available_since(self, threshold: datetime) -> int:
        return int(
            self.session.scalar(
                select(func.count()).where(
                    WorkerHeartbeat.status == "AVAILABLE",
                    WorkerHeartbeat.last_seen_at >= threshold,
                )
            )
            or 0
        )
