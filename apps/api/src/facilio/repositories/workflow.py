"""Workflow and run persistence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from facilio.models.workflow import Workflow, WorkflowRun, WorkflowStep, WorkflowStepRun


class WorkflowRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, workflow: Workflow) -> Workflow:
        self.session.add(workflow)
        self.session.flush()
        return workflow

    def get(self, workflow_id: uuid.UUID) -> Workflow | None:
        stmt = (
            select(Workflow)
            .options(selectinload(Workflow.steps), selectinload(Workflow.runs))
            .where(Workflow.id == workflow_id)
        )
        return self.session.scalar(stmt)

    def list_page(
        self, *, page: int, page_size: int, include_archived: bool
    ) -> tuple[list[Workflow], int]:
        filters = []
        if not include_archived:
            filters.append(Workflow.status != "ARCHIVED")
        total = (
            self.session.scalar(
                select(func.count()).select_from(Workflow).where(*filters)
            )
            or 0
        )
        stmt: Select[tuple[Workflow]] = (
            select(Workflow)
            .options(selectinload(Workflow.steps))
            .where(*filters)
            .order_by(Workflow.updated_at.desc(), Workflow.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.session.scalars(stmt)), int(total)

    def save(self, workflow: Workflow) -> Workflow:
        workflow.updated_at = datetime.now(UTC)
        self.session.add(workflow)
        self.session.flush()
        return workflow

    def delete(self, workflow: Workflow) -> None:
        self.session.delete(workflow)
        self.session.flush()

    def count_active(self) -> int:
        return int(
            self.session.scalar(
                select(func.count()).where(Workflow.status != "ARCHIVED")
            )
            or 0
        )


class WorkflowStepRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, step: WorkflowStep) -> WorkflowStep:
        self.session.add(step)
        self.session.flush()
        return step

    def get(self, workflow_id: uuid.UUID, step_id: uuid.UUID) -> WorkflowStep | None:
        stmt = select(WorkflowStep).where(
            WorkflowStep.id == step_id, WorkflowStep.workflow_id == workflow_id
        )
        return self.session.scalar(stmt)

    def list_for_workflow(self, workflow_id: uuid.UUID) -> list[WorkflowStep]:
        stmt = (
            select(WorkflowStep)
            .where(WorkflowStep.workflow_id == workflow_id)
            .order_by(WorkflowStep.position.asc())
        )
        return list(self.session.scalars(stmt))

    def delete(self, step: WorkflowStep) -> None:
        self.session.delete(step)
        self.session.flush()


class WorkflowRunRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, run: WorkflowRun) -> WorkflowRun:
        self.session.add(run)
        self.session.flush()
        return run

    def get(self, run_id: uuid.UUID) -> WorkflowRun | None:
        stmt = (
            select(WorkflowRun)
            .options(
                selectinload(WorkflowRun.step_runs),
                selectinload(WorkflowRun.workflow),
                selectinload(WorkflowRun.output_version),
                selectinload(WorkflowRun.input_dataset),
            )
            .where(WorkflowRun.id == run_id)
        )
        return self.session.scalar(stmt)

    def list_page(
        self,
        *,
        page: int,
        page_size: int,
        workflow_id: uuid.UUID | None = None,
        dataset_id: uuid.UUID | None = None,
        status: str | None = None,
    ) -> tuple[list[WorkflowRun], int]:
        filters = []
        if workflow_id is not None:
            filters.append(WorkflowRun.workflow_id == workflow_id)
        if dataset_id is not None:
            filters.append(WorkflowRun.input_dataset_id == dataset_id)
        if status is not None:
            filters.append(WorkflowRun.status == status)
        total = (
            self.session.scalar(
                select(func.count()).select_from(WorkflowRun).where(*filters)
            )
            or 0
        )
        stmt = (
            select(WorkflowRun)
            .options(
                selectinload(WorkflowRun.step_runs),
                selectinload(WorkflowRun.workflow),
            )
            .where(*filters)
            .order_by(WorkflowRun.created_at.desc(), WorkflowRun.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.session.scalars(stmt)), int(total)

    def count(self) -> int:
        return int(
            self.session.scalar(select(func.count()).select_from(WorkflowRun)) or 0
        )

    def count_by_status(self, status: str) -> int:
        return int(
            self.session.scalar(
                select(func.count()).where(WorkflowRun.status == status)
            )
            or 0
        )

    def count_for_workflow(self, workflow_id: uuid.UUID) -> int:
        return int(
            self.session.scalar(
                select(func.count()).where(WorkflowRun.workflow_id == workflow_id)
            )
            or 0
        )


class WorkflowStepRunRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, row: WorkflowStepRun) -> WorkflowStepRun:
        self.session.add(row)
        self.session.flush()
        return row
