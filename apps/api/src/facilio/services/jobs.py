"""Job catalog, cancellation, retry, and operational health."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from facilio.core.config import Settings
from facilio.core.errors import AppError, JobNotFoundError
from facilio.core.logging import get_logger
from facilio.core.pagination import parse_page
from facilio.db.session import Database
from facilio.jobs import classify, state
from facilio.jobs.queue import JobQueue
from facilio.models.job import Job, JobAttempt
from facilio.repositories.dataset import DatasetRepository
from facilio.repositories.job import JobRepository, WorkerHeartbeatRepository
from facilio.repositories.version import VersionRepository
from facilio.repositories.workflow import WorkflowRepository, WorkflowRunRepository
from facilio.schemas.jobs import (
    JobAttemptData,
    JobDetail,
    JobListData,
    JobProgressData,
    JobSummary,
    OperationsHealthData,
)
from facilio.schemas.workflows import WorkflowStepRunData
from facilio.services.job_executor import JobExecutor

logger = get_logger("facilio.jobs")

_STATUSES = {
    state.QUEUED,
    state.RUNNING,
    state.SUCCEEDED,
    state.FAILED,
    state.CANCEL_REQUESTED,
    state.CANCELLED,
}


class JobService:
    def __init__(self, settings: Settings, database: Database, queue: JobQueue) -> None:
        self._settings = settings
        self._database = database
        self._queue = queue

    def list_jobs(
        self,
        *,
        page: int,
        page_size: int,
        status: str | None = None,
        job_type: str | None = None,
        workflow_id: str | None = None,
        dataset_id: str | None = None,
        search: str | None = None,
    ) -> JobListData:
        page, page_size = parse_page(page, page_size)
        if status is not None and status not in _STATUSES:
            raise AppError("VALIDATION_ERROR", "Unknown job status.", status_code=422)
        if job_type is not None and job_type != "WORKFLOW_RUN":
            raise AppError("VALIDATION_ERROR", "Unknown job type.", status_code=422)
        wf = _parse_uuid(workflow_id) if workflow_id else None
        ds = _parse_uuid(dataset_id) if dataset_id else None
        with self._database.session_scope() as session:
            items, total = JobRepository(session).list_page(
                page=page,
                page_size=page_size,
                status=status,
                job_type=job_type,
                workflow_id=wf,
                dataset_id=ds,
                search=search,
            )
            summaries = [self._to_summary(session, item) for item in items]
            return JobListData(
                items=summaries, page=page, page_size=page_size, total=total
            )

    def get_job(self, job_id: str) -> JobDetail:
        identity = _parse_job(job_id)
        with self._database.session_scope() as session:
            job = JobRepository(session).get(identity)
            if job is None:
                raise JobNotFoundError
            return self._to_detail(session, job)

    def cancel(self, job_id: str) -> JobDetail:
        identity = _parse_job(job_id)
        with self._database.session_scope() as session:
            job = JobRepository(session).get_for_update(identity)
            if job is None:
                raise JobNotFoundError
            run = WorkflowRunRepository(session).get(job.workflow_run_id)
            if job.status == state.SUCCEEDED or (
                run is not None and run.output_version_id
            ):
                raise AppError(
                    "JOB_CANCEL_NOT_ALLOWED",
                    "A completed job cannot be cancelled.",
                    status_code=409,
                )
            if job.status in {state.FAILED, state.CANCELLED, state.CANCEL_REQUESTED}:
                if job.status == state.CANCEL_REQUESTED:
                    return self._to_detail(session, job)
                raise AppError(
                    "JOB_CANCEL_NOT_ALLOWED",
                    "This job is already finished.",
                    status_code=409,
                )
            now = datetime.now(UTC)
            if job.status == state.QUEUED:
                state.assert_transition(job.status, state.CANCELLED)
                job.status = state.CANCELLED
                job.cancelled_at = now
                job.completed_at = now
                job.cancel_requested_at = now
                job.error_code = "JOB_CANCELLED"
                job.error_message_safe = "Cancelled before a worker claimed the job."
                job.current_activity = None
                if run is not None:
                    run.status = "CANCELLED"
                    run.completed_at = now
                    run.error_code = "JOB_CANCELLED"
                    run.error_message_safe = job.error_message_safe
                    for step in run.step_runs:
                        if step.status in {"PENDING", "RUNNING"}:
                            step.status = "CANCELLED"
            else:
                state.assert_transition(job.status, state.CANCEL_REQUESTED)
                job.status = state.CANCEL_REQUESTED
                job.cancel_requested_at = now
                job.current_activity = (
                    "Cancellation requested. The current step will finish "
                    "before execution stops."
                )
            JobRepository(session).save(job)
            logger.info("job cancel requested job_id=%s status=%s", job.id, job.status)
            return self._to_detail(session, job)

    def retry(self, job_id: str) -> JobDetail:
        identity = _parse_job(job_id)
        with self._database.session_scope() as session:
            job = JobRepository(session).get_for_update(identity)
            if job is None:
                raise JobNotFoundError
            if job.status != state.FAILED:
                raise AppError(
                    "JOB_RETRY_NOT_ALLOWED",
                    "Only failed jobs can be retried.",
                    status_code=409,
                )
            if not job.retryable:
                raise AppError(
                    "JOB_RETRY_NOT_ALLOWED",
                    "This failure is not retryable. "
                    "Create a new run if the workflow changed.",
                    status_code=409,
                )
            if job.attempt_count >= job.max_attempts:
                raise AppError(
                    "JOB_ATTEMPTS_EXHAUSTED",
                    "This job has no remaining attempts.",
                    status_code=409,
                )
            run = WorkflowRunRepository(session).get(job.workflow_run_id)
            if run is not None and run.output_version_id is not None:
                JobExecutor(self._settings, self._database)._mark_success_locked(
                    session, job, run
                )
                return self._to_detail(session, job)
            state.assert_transition(job.status, state.QUEUED)
            now = datetime.now(UTC)
            job.status = state.QUEUED
            job.queued_at = now
            job.started_at = None
            job.completed_at = None
            job.progress_current = 0
            job.current_step_position = None
            job.current_operation_code = None
            job.current_activity = "Waiting for worker"
            job.error_code = None
            job.error_message_safe = None
            job.error_category = None
            JobRepository(session).save(job)
            if run is not None:
                run.status = "QUEUED"
                run.started_at = None
                run.completed_at = None
                run.error_code = None
                run.error_message_safe = None
                for step in run.step_runs:
                    step.status = "PENDING"
                    step.started_at = None
                    step.completed_at = None
                    step.duration_ms = None
                    step.error_code = None
                    step.error_message_safe = None
            try:
                self._queue.enqueue(str(job.id))
            except AppError as error:
                job.status = state.FAILED
                job.error_code = "QUEUE_DISPATCH_FAILED"
                job.error_message_safe = error.message
                job.error_category = classify.INFRASTRUCTURE
                job.retryable = True
                job.completed_at = datetime.now(UTC)
                JobRepository(session).save(job)
                raise AppError(
                    "QUEUE_DISPATCH_FAILED",
                    "The job was recorded but could not be queued.",
                    status_code=503,
                ) from error
            logger.info("job requeued job_id=%s", job.id)
            return self._to_detail(session, job)

    def operations_health(self) -> OperationsHealthData:
        queue_ready = self._queue.ping()
        queued = self._queue.queued_count()
        try:
            rq_workers = self._queue.live_workers()
        except Exception:
            rq_workers = 0
        threshold = datetime.now(UTC) - timedelta(
            seconds=self._settings.WORKER_HEARTBEAT_SECONDS * 3
        )
        with self._database.session_scope() as session:
            heartbeats = WorkerHeartbeatRepository(session).available_since(threshold)
            latest = WorkerHeartbeatRepository(session).latest()
            jobs = JobRepository(session)
            workers = max(heartbeats, rq_workers)
            return OperationsHealthData(
                queue={
                    "status": "ready"
                    if queue_ready
                    else (
                        "not_configured"
                        if not self._settings.REDIS_URL
                        else "unavailable"
                    ),
                    "backend": self._queue.backend(),
                    "queued_count": queued,
                    "name": self._settings.JOB_QUEUE_NAME,
                },
                worker={
                    "status": "available" if workers > 0 else "unavailable",
                    "available_count": workers,
                    "last_seen_at": latest.last_seen_at.isoformat() if latest else None,
                },
                jobs={
                    "queued": jobs.count_by_status(state.QUEUED),
                    "running": jobs.count_by_status(state.RUNNING),
                    "failed": jobs.count_by_status(state.FAILED),
                    "succeeded": jobs.count_by_status(state.SUCCEEDED),
                },
            )

    def recover_stale(self) -> int:
        recovered = JobExecutor(self._settings, self._database).recover_stale()
        recovered += self._promote_output_as_success()
        recovered += self._fail_orphan_queued()
        return recovered

    def _promote_output_as_success(self) -> int:
        promoted = 0
        executor = JobExecutor(self._settings, self._database)
        with self._database.session_scope() as session:
            for job in JobRepository(session).failed_with_output():
                run = WorkflowRunRepository(session).get(job.workflow_run_id)
                if run is None or run.output_version_id is None:
                    continue
                executor._mark_success_locked(session, job, run)
                promoted += 1
                logger.info("job promoted after durable output job_id=%s", job.id)
        return promoted

    def _fail_orphan_queued(self) -> int:
        if self._settings.REDIS_URL and not self._queue.ping():
            return 0
        threshold = datetime.now(UTC) - timedelta(
            seconds=self._settings.JOB_STALE_SECONDS
        )
        failed = 0
        now = datetime.now(UTC)
        with self._database.session_scope() as session:
            for job in JobRepository(session).stale_queued(threshold):
                if self._queue.contains(str(job.id)):
                    continue
                job.status = state.FAILED
                job.completed_at = now
                job.error_code = "QUEUE_ORPHAN"
                job.error_message_safe = (
                    "This cleanup never reached a worker. "
                    "Your original data is unchanged."
                )
                job.error_category = classify.INFRASTRUCTURE
                job.retryable = True
                job.current_activity = None
                JobRepository(session).save(job)
                run = WorkflowRunRepository(session).get(job.workflow_run_id)
                if run is not None and run.output_version_id is None:
                    run.status = "FAILED"
                    run.completed_at = now
                    run.error_code = "QUEUE_ORPHAN"
                    run.error_message_safe = job.error_message_safe
                failed += 1
                logger.info("orphan queued job failed job_id=%s", job.id)
        return failed

    def _to_summary(self, session, job: Job) -> JobSummary:
        workflow_name = None
        dataset_name = None
        input_number = None
        output_number = None
        output_profile_status = None
        if job.workflow_id:
            workflow = WorkflowRepository(session).get(job.workflow_id)
            if workflow is not None:
                workflow_name = workflow.name
        if job.dataset_id:
            dataset = DatasetRepository(session).get(job.dataset_id)
            if dataset is not None:
                dataset_name = dataset.name
        versions = VersionRepository(session)
        if job.input_version_id:
            version = versions.get(job.input_version_id)
            if version is not None:
                input_number = version.version_number
        if job.output_version_id:
            version = versions.get(job.output_version_id)
            if version is not None:
                output_number = version.version_number
                output_profile_status = version.profile_status
        if workflow_name is None and job.workflow_run is not None:
            workflow_name = str(
                job.workflow_run.workflow_snapshot.get("name") or "Workflow"
            )
        queue_ms = _delta_ms(job.queued_at, job.started_at)
        execution_ms = _delta_ms(job.started_at, job.completed_at)
        total_ms = _delta_ms(job.queued_at, job.completed_at)
        return JobSummary(
            id=job.id,
            job_type=job.job_type,  # type: ignore[arg-type]
            status=job.status,  # type: ignore[arg-type]
            workflow_run_id=job.workflow_run_id,
            workflow_id=job.workflow_id,
            workflow_name=workflow_name,
            dataset_id=job.dataset_id,
            dataset_name=dataset_name,
            input_version_id=job.input_version_id,
            input_version_number=input_number,
            output_version_id=job.output_version_id,
            output_version_number=output_number,
            output_profile_status=output_profile_status,
            queue_name=job.queue_name,
            attempt_count=job.attempt_count,
            max_attempts=job.max_attempts,
            progress=JobProgressData(
                current=job.progress_current,
                total=job.progress_total,
                label=_progress_label(job.progress_current, job.progress_total),
            ),
            current_step_position=job.current_step_position,
            current_operation_code=job.current_operation_code,
            current_activity=job.current_activity,
            queued_at=job.queued_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            heartbeat_at=job.heartbeat_at,
            queue_ms=queue_ms,
            execution_ms=execution_ms,
            total_ms=total_ms,
            error_code=job.error_code,
            error_message_safe=job.error_message_safe,
            error_category=job.error_category,  # type: ignore[arg-type]
            retryable=job.retryable,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )

    def _to_detail(self, session, job: Job) -> JobDetail:
        summary = self._to_summary(session, job)
        run = WorkflowRunRepository(session).get(job.workflow_run_id)
        rows_before = None
        rows_after = None
        if run is not None and run.step_runs:
            first = min(run.step_runs, key=lambda item: item.position)
            last = max(run.step_runs, key=lambda item: item.position)
            rows_before = first.rows_before
            rows_after = last.rows_after
        return JobDetail(
            **summary.model_dump(),
            request_id=job.request_id,
            cancel_requested_at=job.cancel_requested_at,
            cancelled_at=job.cancelled_at,
            attempts=[_to_attempt(item) for item in job.attempts],
            step_runs=[_step_run(item) for item in (run.step_runs if run else [])],
            workflow_revision=run.workflow_revision if run else None,
            workflow_run_status=run.status if run else None,
            quality_before=run.quality_before if run else None,
            quality_after=run.quality_after if run else None,
            rows_before=rows_before,
            rows_after=rows_after,
        )


def _step_run(row) -> WorkflowStepRunData:
    return WorkflowStepRunData(
        id=row.id,
        workflow_run_id=row.workflow_run_id,
        workflow_step_id=row.workflow_step_id,
        position=row.position,
        operation_code=row.operation_code,
        status=row.status,
        duration_ms=row.duration_ms,
        rows_before=row.rows_before,
        rows_after=row.rows_after,
        columns_before=row.columns_before,
        columns_after=row.columns_after,
        changed_cells=row.changed_cells,
        removed_rows=row.removed_rows,
        removed_columns=row.removed_columns,
        warning_summary=row.warning_summary,
        error_code=row.error_code,
        error_message_safe=row.error_message_safe,
        step_snapshot=dict(row.step_snapshot or {}),
    )


def _to_attempt(row: JobAttempt) -> JobAttemptData:
    return JobAttemptData(
        id=row.id,
        job_id=row.job_id,
        attempt_number=row.attempt_number,
        status=row.status,  # type: ignore[arg-type]
        worker_id=row.worker_id,
        started_at=row.started_at,
        completed_at=row.completed_at,
        duration_ms=row.duration_ms,
        error_code=row.error_code,
        error_message_safe=row.error_message_safe,
        error_category=row.error_category,  # type: ignore[arg-type]
    )


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _progress_label(current: int, total: int) -> str:
    if total <= 0:
        return "No enabled steps"
    return f"{current} of {total} steps complete"


def _delta_ms(start: datetime | None, end: datetime | None) -> int | None:
    if start is None or end is None:
        return None
    return max(0, int((_aware(end) - _aware(start)).total_seconds() * 1000))


def _parse_job(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise JobNotFoundError from None


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise AppError(
            "VALIDATION_ERROR", "Invalid identifier.", status_code=422
        ) from None
