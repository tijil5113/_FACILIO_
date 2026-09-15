"""Worker-side job execution. Reuses the Phase 6 pipeline, not a second engine."""

from __future__ import annotations

import os
import socket
import uuid
from collections.abc import Callable
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.exc import IntegrityError

from facilio.core.config import Settings
from facilio.core.errors import AppError, DatasetNotFoundError
from facilio.core.logging import get_logger
from facilio.db.session import Database
from facilio.jobs import classify, state
from facilio.models.job import Job, JobAttempt
from facilio.models.version import DatasetVersion
from facilio.models.workflow import WorkflowRun, WorkflowStepRun
from facilio.repositories.dataset import DatasetRepository
from facilio.repositories.job import (
    JobAttemptRepository,
    JobRepository,
    WorkerHeartbeatRepository,
)
from facilio.repositories.profile import ProfileRepository
from facilio.repositories.version import VersionRepository
from facilio.repositories.workflow import WorkflowRepository, WorkflowRunRepository
from facilio.services.frames import load_version_frame, write_derived_table
from facilio.storage.local import LocalStorageService

logger = get_logger("facilio.jobs.executor")


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def default_worker_id() -> str:
    return f"{socket.gethostname()}:{os.getpid()}"


class JobExecutor:
    def __init__(
        self,
        settings: Settings,
        database: Database,
        *,
        worker_id: str | None = None,
    ) -> None:
        self._settings = settings
        self._database = database
        self._storage = LocalStorageService(settings.upload_root_path())
        self._worker_id = worker_id or default_worker_id()

    def execute(
        self,
        job_id: str,
        *,
        after_step: Callable[[], None] | None = None,
    ) -> None:
        identity = _parse_job(job_id)
        claimed = self._claim(identity)
        if claimed is None:
            return
        job, attempt = claimed
        try:
            self._run_attempt(job.id, attempt.id, after_step=after_step)
        except AppError as error:
            logger.info(
                "job failed job_id=%s run_id=%s code=%s",
                job.id,
                job.workflow_run_id,
                error.code,
            )
            self._fail(job.id, attempt.id, error.code, error.message)
        except Exception:
            logger.exception("job crashed job_id=%s", job.id)
            self._fail(
                job.id,
                attempt.id,
                "WORKFLOW_EXECUTION_FAILED",
                "The workflow could not be executed.",
            )

    def recover_stale(self) -> int:
        threshold = datetime.now(UTC) - timedelta(
            seconds=self._settings.JOB_STALE_SECONDS
        )
        recovered = 0
        with self._database.session_scope() as session:
            jobs = JobRepository(session).stale_running(threshold)
            for job in jobs:
                run = WorkflowRunRepository(session).get(job.workflow_run_id)
                if run is not None and run.output_version_id is not None:
                    self._mark_success_locked(session, job, run)
                else:
                    self._mark_lost_locked(session, job, run)
                recovered += 1
                logger.info("stale job recovered job_id=%s", job.id)
        return recovered

    def heartbeat_worker(self, *, status: str = "AVAILABLE") -> None:
        with self._database.session_scope() as session:
            WorkerHeartbeatRepository(session).upsert(self._worker_id, status=status)

    def _claim(self, job_id: uuid.UUID) -> tuple[Job, JobAttempt] | None:
        with self._database.session_scope() as session:
            repo = JobRepository(session)
            job = repo.get_for_update(job_id)
            if job is None:
                logger.info("job missing job_id=%s", job_id)
                return None
            if job.status == state.SUCCEEDED:
                logger.info("job already succeeded job_id=%s", job_id)
                return None
            if job.status in {state.CANCELLED, state.FAILED}:
                return None
            if job.status == state.RUNNING:
                run = WorkflowRunRepository(session).get(job.workflow_run_id)
                if run is not None and run.output_version_id is not None:
                    self._mark_success_locked(session, job, run)
                return None
            if job.status == state.CANCEL_REQUESTED:
                self._cancel_locked(session, job, started=False)
                return None
            if job.status != state.QUEUED:
                return None
            now = datetime.now(UTC)
            job.status = state.RUNNING
            job.started_at = now
            job.heartbeat_at = now
            job.current_activity = "Waiting for worker"
            job.attempt_count += 1
            job.error_code = None
            job.error_message_safe = None
            attempt = JobAttempt(
                job_id=job.id,
                attempt_number=job.attempt_count,
                status=state.RUNNING,
                worker_id=self._worker_id,
                started_at=now,
            )
            JobAttemptRepository(session).add(attempt)
            run = WorkflowRunRepository(session).get(job.workflow_run_id)
            if run is not None:
                run.status = "RUNNING"
                run.started_at = now
            repo.save(job)
            WorkerHeartbeatRepository(session).upsert(self._worker_id)
            logger.info(
                "job claimed job_id=%s run_id=%s attempt=%s worker=%s",
                job.id,
                job.workflow_run_id,
                attempt.attempt_number,
                self._worker_id,
            )
            return job, attempt

    def _run_attempt(
        self,
        job_id: uuid.UUID,
        attempt_id: uuid.UUID,
        *,
        after_step: Callable[[], None] | None,
    ) -> None:
        from facilio_processing.inference import columns_from_frame
        from facilio_processing.workflows import WorkflowStepSpec, execute_pipeline

        with self._database.session_scope() as session:
            job = JobRepository(session).get(job_id)
            run = (
                WorkflowRunRepository(session).get(job.workflow_run_id) if job else None
            )
            if job is None or run is None:
                raise AppError(
                    "JOB_NOT_FOUND", "The job could not be loaded.", status_code=404
                )
            if run.output_version_id is not None:
                self._mark_success_locked(session, job, run)
                return
            dataset, version = _require_input(
                session, run.input_dataset_id, run.input_version_id
            )
            snapshot = dict(run.workflow_snapshot or {})
            specs = _specs_from_snapshot(snapshot)
            frame = load_version_frame(self._storage, dataset, version)
            quality_before = _quality_score(session, version.id)
            dataset_uuid = dataset.id
            version_uuid = version.id
            workflow_name = str(snapshot.get("name") or "Workflow")
            if snapshot.get("origin") == "GUIDED_CLEANUP":
                workflow_name = "Guided cleanup"
            revision = int(snapshot.get("revision") or run.workflow_revision)
            run_id = run.id
            self._heartbeat(session, job, "Executing workflow")

        def on_start(step: WorkflowStepSpec, index: int, total: int) -> None:
            with self._database.session_scope() as session:
                job_row = JobRepository(session).get(job_id)
                if job_row is None:
                    return
                job_row.current_step_position = step.position
                job_row.current_operation_code = step.operation_code
                job_row.current_activity = f"Executing step {index + 1} of {total}"
                job_row.heartbeat_at = datetime.now(UTC)
                JobRepository(session).save(job_row)
                _set_step_status(session, run_id, step, "RUNNING")
                WorkerHeartbeatRepository(session).upsert(self._worker_id)

        def on_complete(result, index: int, total: int) -> None:
            with self._database.session_scope() as session:
                job_row = JobRepository(session).get(job_id)
                if job_row is None:
                    return
                _apply_step_result(session, run_id, result)
                if result.status == "SUCCEEDED":
                    job_row.progress_current = min(
                        job_row.progress_total, job_row.progress_current + 1
                    )
                job_row.heartbeat_at = datetime.now(UTC)
                JobRepository(session).save(job_row)
            if after_step is not None and result.status in {"SUCCEEDED", "FAILED"}:
                after_step()

        def should_stop() -> bool:
            with self._database.session_scope() as session:
                job_row = JobRepository(session).get(job_id)
                return bool(
                    job_row is not None and job_row.status == state.CANCEL_REQUESTED
                )

        result_frame, pipeline = execute_pipeline(
            frame,
            specs,
            on_step_start=on_start,
            on_step_complete=on_complete,
            should_stop=should_stop,
        )
        if pipeline.cancelled:
            with self._database.session_scope() as session:
                job_row = JobRepository(session).get(job_id)
                run_row = WorkflowRunRepository(session).get(run_id)
                if job_row is not None:
                    self._cancel_locked(session, job_row, started=True, run=run_row)
            return
        if pipeline.no_op:
            raise AppError(
                "WORKFLOW_NOOP",
                "No changes would be produced. A new version was not created.",
                status_code=409,
            )
        if pipeline.failed:
            raise AppError(
                pipeline.error_code or "WORKFLOW_EXECUTION_FAILED",
                pipeline.error_message or "A workflow step failed.",
                status_code=400,
            )

        output_id = uuid.uuid4()
        with self._database.session_scope() as session:
            job_row = JobRepository(session).get(job_id)
            run_row = WorkflowRunRepository(session).get(run_id)
            if job_row is None or run_row is None:
                raise AppError(
                    "JOB_NOT_FOUND", "The job could not be loaded.", status_code=404
                )
            if run_row.output_version_id is not None:
                self._mark_success_locked(session, job_row, run_row)
                return
            job_row.current_activity = "Writing output version"
            job_row.heartbeat_at = datetime.now(UTC)
            JobRepository(session).save(job_row)

        storage_key = write_derived_table(
            self._storage, dataset_uuid, output_id, result_frame
        )
        try:
            with self._database.session_scope() as session:
                job_row = JobRepository(session).get(job_id)
                run_row = WorkflowRunRepository(session).get(run_id)
                if job_row is None or run_row is None:
                    raise AppError(
                        "JOB_NOT_FOUND", "The job could not be loaded.", status_code=404
                    )
                if run_row.output_version_id is not None:
                    self._storage.delete_prefix(f"{dataset_uuid}/versions/{output_id}")
                    self._mark_success_locked(session, job_row, run_row)
                    return
                columns = [
                    asdict(column) for column in columns_from_frame(result_frame)
                ]
                versions = VersionRepository(session)
                number = versions.next_version_number(dataset_uuid)
                version_label = (
                    "Guided cleanup"
                    if snapshot.get("origin") == "GUIDED_CLEANUP"
                    else f"Workflow {workflow_name} · Revision {revision}"
                )
                child = DatasetVersion(
                    id=output_id,
                    dataset_id=dataset_uuid,
                    version_number=number,
                    parent_version_id=version_uuid,
                    kind="DERIVED",
                    storage_key=storage_key,
                    storage_format="facilio.table.v1",
                    row_count=int(result_frame.shape[0]),
                    column_count=int(result_frame.shape[1]),
                    columns_json=columns,
                    label=version_label,
                    profile_status="NOT_PROFILED",
                    created_by_workflow_run_id=run_id,
                )
                versions.add(child)
                run_row.output_version_id = child.id
                dataset_row = DatasetRepository(session).get(dataset_uuid)
                if dataset_row is None:
                    raise DatasetNotFoundError
                dataset_row.current_version_id = child.id
                dataset_row.row_count = child.row_count
                dataset_row.column_count = child.column_count
                dataset_row.columns_json = columns
                DatasetRepository(session).save(dataset_row)
                job_row.output_version_id = child.id
                job_row.current_activity = (
                    "Finishing analysis"
                    if snapshot.get("origin") == "GUIDED_CLEANUP"
                    else "Profiling output"
                )
                job_row.heartbeat_at = datetime.now(UTC)
                JobRepository(session).save(job_row)
        except IntegrityError:
            self._storage.delete_prefix(f"{dataset_uuid}/versions/{output_id}")
            with self._database.session_scope() as session:
                job_row = JobRepository(session).get(job_id)
                run_row = WorkflowRunRepository(session).get(run_id)
                if (
                    job_row is not None
                    and run_row is not None
                    and run_row.output_version_id
                ):
                    self._mark_success_locked(session, job_row, run_row)
                    return
            raise AppError(
                "JOB_FINALIZATION_FAILED",
                "The workflow result could not be persisted.",
                status_code=500,
            ) from None
        except Exception:
            self._storage.delete_prefix(f"{dataset_uuid}/versions/{output_id}")
            raise

        quality_after = None
        try:
            from facilio.services.profiles import ProfileService

            ProfileService(self._settings, self._database).run_profile(
                str(dataset_uuid), str(output_id)
            )
            quality_after = self._quality_after(str(dataset_uuid), str(output_id))
        except AppError:
            logger.info(
                "workflow output profile failed dataset_id=%s version_id=%s",
                dataset_uuid,
                output_id,
            )
        with self._database.session_scope() as session:
            job_row = JobRepository(session).get(job_id)
            run_row = WorkflowRunRepository(session).get(run_id)
            if job_row is None or run_row is None:
                return
            run_row.quality_before = quality_before
            run_row.quality_after = quality_after
            job_row.current_activity = "Finalizing run"
            job_row.heartbeat_at = datetime.now(UTC)
            self._mark_success_locked(
                session, job_row, run_row, duration_ms=pipeline.duration_ms
            )

    def _fail(
        self, job_id: uuid.UUID, attempt_id: uuid.UUID, code: str, message: str
    ) -> None:
        category = classify.classify(code)
        retryable = classify.is_retryable(code, category)
        now = datetime.now(UTC)
        with self._database.session_scope() as session:
            job = JobRepository(session).get(job_id)
            if job is None or job.status in state.TERMINAL:
                return
            if job.status == state.SUCCEEDED:
                return
            job.status = state.FAILED
            job.completed_at = now
            job.error_code = code
            job.error_message_safe = message
            job.error_category = category
            job.retryable = retryable
            job.current_activity = None
            job.heartbeat_at = now
            JobRepository(session).save(job)
            run = WorkflowRunRepository(session).get(job.workflow_run_id)
            if run is not None and run.output_version_id is None:
                run.status = "FAILED"
                run.completed_at = now
                run.error_code = code
                run.error_message_safe = message
                if run.started_at:
                    run.duration_ms = max(
                        0,
                        int(
                            (_aware(now) - _aware(run.started_at)).total_seconds()
                            * 1000
                        ),
                    )
            for attempt in job.attempts:
                if attempt.id == attempt_id and attempt.completed_at is None:
                    attempt.status = state.FAILED
                    attempt.completed_at = now
                    attempt.error_code = code
                    attempt.error_message_safe = message
                    attempt.error_category = category
                    attempt.duration_ms = max(
                        0,
                        int(
                            (_aware(now) - _aware(attempt.started_at)).total_seconds()
                            * 1000
                        ),
                    )
            if run is not None and run.workflow_id is not None:
                workflow = WorkflowRepository(session).get(run.workflow_id)
                if workflow is not None:
                    workflow.last_run_at = now
                    WorkflowRepository(session).save(workflow)

    def _cancel_locked(
        self,
        session,
        job: Job,
        *,
        started: bool,
        run: WorkflowRun | None = None,
    ) -> None:
        now = datetime.now(UTC)
        if job.status == state.SUCCEEDED or (run and run.output_version_id):
            return
        state.assert_transition(
            job.status
            if job.status != state.CANCEL_REQUESTED
            else state.CANCEL_REQUESTED,
            state.CANCELLED,
        )
        job.status = state.CANCELLED
        job.cancelled_at = now
        job.completed_at = now
        job.current_activity = None
        job.retryable = False
        job.error_code = "JOB_CANCELLED"
        job.error_message_safe = (
            "Execution was cancelled before an output version was created."
        )
        JobRepository(session).save(job)
        run_row = run or WorkflowRunRepository(session).get(job.workflow_run_id)
        if run_row is not None and run_row.output_version_id is None:
            run_row.status = "CANCELLED"
            run_row.completed_at = now
            run_row.error_code = "JOB_CANCELLED"
            run_row.error_message_safe = job.error_message_safe
            for step in run_row.step_runs:
                if step.status in {"PENDING", "RUNNING"}:
                    step.status = "CANCELLED"
        for attempt in job.attempts:
            if attempt.completed_at is None:
                attempt.status = state.CANCELLED
                attempt.completed_at = now
                attempt.duration_ms = max(
                    0,
                    int(
                        (_aware(now) - _aware(attempt.started_at)).total_seconds()
                        * 1000
                    ),
                )
        logger.info("job cancelled job_id=%s started=%s", job.id, started)

    def _mark_success_locked(
        self,
        session,
        job: Job,
        run: WorkflowRun,
        *,
        duration_ms: int | None = None,
    ) -> None:
        now = datetime.now(UTC)
        job.status = state.SUCCEEDED
        job.completed_at = now
        job.output_version_id = run.output_version_id
        job.progress_current = job.progress_total
        job.current_activity = None
        job.error_code = None
        job.error_message_safe = None
        job.retryable = False
        job.heartbeat_at = now
        JobRepository(session).save(job)
        run.status = "SUCCEEDED"
        run.completed_at = now
        run.duration_ms = duration_ms if duration_ms is not None else run.duration_ms
        if run.started_at and run.duration_ms is None:
            run.duration_ms = max(
                0, int((_aware(now) - _aware(run.started_at)).total_seconds() * 1000)
            )
        for attempt in job.attempts:
            if attempt.completed_at is None:
                attempt.status = state.SUCCEEDED
                attempt.completed_at = now
                attempt.duration_ms = max(
                    0,
                    int(
                        (_aware(now) - _aware(attempt.started_at)).total_seconds()
                        * 1000
                    ),
                )
        if run.workflow_id is not None:
            workflow = WorkflowRepository(session).get(run.workflow_id)
            if workflow is not None:
                workflow.last_run_at = now
                WorkflowRepository(session).save(workflow)
        logger.info("job succeeded job_id=%s run_id=%s", job.id, run.id)

    def _mark_lost_locked(self, session, job: Job, run: WorkflowRun | None) -> None:
        now = datetime.now(UTC)
        job.status = state.FAILED
        job.completed_at = now
        job.error_code = "WORKER_LOST"
        job.error_message_safe = "The worker stopped reporting before the job finished."
        job.error_category = classify.WORKER
        job.retryable = True
        job.current_activity = None
        JobRepository(session).save(job)
        if run is not None and run.output_version_id is None:
            run.status = "FAILED"
            run.completed_at = now
            run.error_code = "WORKER_LOST"
            run.error_message_safe = job.error_message_safe
        for attempt in job.attempts:
            if attempt.completed_at is None:
                attempt.status = state.FAILED
                attempt.completed_at = now
                attempt.error_code = "WORKER_LOST"
                attempt.error_message_safe = job.error_message_safe
                attempt.error_category = classify.WORKER

    def _heartbeat(self, session, job: Job, activity: str) -> None:
        job.current_activity = activity
        job.heartbeat_at = datetime.now(UTC)
        JobRepository(session).save(job)
        WorkerHeartbeatRepository(session).upsert(self._worker_id)

    def _quality_after(self, dataset_id: str, version_id: str) -> float | None:
        from facilio.services.profiles import ProfileService

        try:
            profile = ProfileService(self._settings, self._database).get_profile(
                dataset_id, version_id
            )
        except AppError:
            return None
        if profile.status != "READY" or profile.quality is None:
            return None
        return profile.quality.overall_score


def _parse_job(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        from facilio.core.errors import JobNotFoundError

        raise JobNotFoundError from None


def _require_input(session, dataset_id, version_id):
    if dataset_id is None or version_id is None:
        raise AppError(
            "WORKFLOW_INPUT_VERSION_NOT_FOUND",
            "The requested dataset version was not found.",
            status_code=404,
        )
    dataset = DatasetRepository(session).get(dataset_id)
    if dataset is None:
        raise DatasetNotFoundError
    version = VersionRepository(session).get_for_dataset(dataset_id, version_id)
    if version is None:
        raise AppError(
            "WORKFLOW_INPUT_VERSION_NOT_FOUND",
            "The requested dataset version was not found.",
            status_code=404,
        )
    return dataset, version


def _quality_score(session, version_id: uuid.UUID) -> float | None:
    row = ProfileRepository(session).get_for_version(version_id)
    if row is None or row.status != "READY":
        return None
    return row.overall_score


def _specs_from_snapshot(snapshot: dict[str, Any]):
    from facilio_processing.workflows import WorkflowStepSpec

    steps = snapshot.get("steps") or []
    return [
        WorkflowStepSpec(
            id=str(item.get("id")),
            position=int(item.get("position") or 0),
            operation_code=str(item.get("operation_code")),
            parameters=dict(item.get("parameters") or {}),
            enabled=bool(item.get("enabled", True)),
        )
        for item in steps
    ]


def _set_step_status(session, run_id: uuid.UUID, step, status: str) -> None:
    run = WorkflowRunRepository(session).get(run_id)
    if run is None:
        return
    now = datetime.now(UTC)
    for row in run.step_runs:
        if str(row.workflow_step_id) == str(step.id) or row.position == step.position:
            row.status = status
            row.started_at = now
            row.operation_code = step.operation_code


def _apply_step_result(session, run_id: uuid.UUID, result) -> None:
    run = WorkflowRunRepository(session).get(run_id)
    if run is None:
        return
    impact = result.impact
    now = datetime.now(UTC)
    for row in run.step_runs:
        if (
            str(row.workflow_step_id) == str(result.step_id)
            or row.position == result.position
        ):
            row.status = result.status
            row.completed_at = now if result.status != "PENDING" else None
            row.duration_ms = result.duration_ms
            row.error_code = result.error_code
            row.error_message_safe = result.error_message
            row.warning_summary = (
                "; ".join(result.warnings) if result.warnings else None
            )
            if impact is not None:
                row.rows_before = impact.rows_before
                row.rows_after = impact.rows_after
                row.columns_before = impact.columns_before
                row.columns_after = impact.columns_after
                row.changed_cells = impact.changed_cell_count
                row.removed_rows = impact.removed_row_count
                row.removed_columns = impact.removed_column_count
            return
    session.add(
        WorkflowStepRun(
            workflow_run_id=run_id,
            workflow_step_id=_maybe_uuid(result.step_id),
            step_snapshot={
                "id": result.step_id,
                "position": result.position,
                "operation_code": result.operation_code,
                "parameters": dict(result.parameters),
            },
            position=result.position,
            operation_code=result.operation_code,
            status=result.status,
            completed_at=now,
            duration_ms=result.duration_ms,
            error_code=result.error_code,
            error_message_safe=result.error_message,
        )
    )


def _maybe_uuid(value: str):
    try:
        return uuid.UUID(str(value))
    except ValueError:
        return None
