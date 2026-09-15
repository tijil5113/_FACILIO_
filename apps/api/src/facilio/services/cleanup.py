"""Guided Cleanup orchestration.

Recommendations live in the processing engine. Preview and apply reuse the
Phase 6 pipeline. Apply persists a one-off WorkflowRun and executes it through
JobExecutor in-process so one cleanup creates one DatasetVersion without
requiring a saved workflow or a worker.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict
from typing import Any

from facilio.core.config import Settings
from facilio.core.errors import (
    AppError,
    DatasetNotFoundError,
    ProfileNotFoundError,
    ProfileNotReadyError,
    VersionNotFoundError,
)
from facilio.core.logging import get_logger
from facilio.core.request_id import get_request_id
from facilio.db.session import Database
from facilio.jobs import state
from facilio.models.job import Job
from facilio.models.workflow import WorkflowRun, WorkflowStepRun
from facilio.repositories.dataset import DatasetRepository
from facilio.repositories.job import JobRepository
from facilio.repositories.profile import ProfileRepository
from facilio.repositories.version import VersionRepository
from facilio.repositories.workflow import WorkflowRunRepository
from facilio.schemas.cleanup import (
    CleanupApplyData,
    CleanupApplyRequest,
    CleanupPreviewData,
    CleanupPreviewExample,
    CleanupPreviewRequest,
    CleanupRecommendationsData,
    GuidedRecommendationData,
)
from facilio.schemas.jobs import JobSummary
from facilio.schemas.transformations import (
    QualityDeltaData,
    QualityDeltaDimension,
    TransformationImpactData,
)
from facilio.schemas.workflows import WorkflowRunDetail
from facilio.services.frames import load_version_frame
from facilio.services.job_executor import JobExecutor
from facilio.services.jobs import JobService
from facilio.storage.local import LocalStorageService

logger = get_logger("facilio.cleanup")

SELECTION_POLICY = (
    "Low-impact text cleanup (trim, consistent capitalization) is preselected. "
    "Numeric fill with median is preselected when missingness is not extreme. "
    "Row removal, drop-column, and fills that need a typed-in value are never "
    "preselected."
)

_GUIDED_CODES = frozenset(
    {
        "TRIM_WHITESPACE",
        "NORMALIZE_CASE",
        "FILL_MISSING",
        "DROP_MISSING_ROWS",
        "REMOVE_DUPLICATES",
    }
)


class CleanupService:
    def __init__(self, settings: Settings, database: Database) -> None:
        self._settings = settings
        self._database = database
        self._storage = LocalStorageService(settings.upload_root_path())

    def recommendations(
        self, dataset_id: str, version_id: str
    ) -> CleanupRecommendationsData:
        from facilio_processing.cleanup import (
            GUIDED_ENGINE_VERSION,
            build_recommendations,
        )

        dataset, version, profile = self._require_ready_profile(dataset_id, version_id)
        issues = [
            {
                "id": item.issue_key,
                "issue_key": item.issue_key,
                "code": item.code,
                "title": item.title,
                "description": item.description,
                "column": item.column_name,
                "affected_count": item.affected_count,
                "evidence": item.evidence_json or [],
            }
            for item in profile.issues
        ]
        column_types = {
            col.name: str(col.detected_type or "UNKNOWN") for col in profile.columns
        }
        recs = build_recommendations(issues, column_types=column_types)
        payload = [
            GuidedRecommendationData.model_validate(item.to_dict()) for item in recs
        ]
        return CleanupRecommendationsData(
            dataset_id=dataset.id,
            version_id=version.id,
            version_number=version.version_number,
            engine_version=GUIDED_ENGINE_VERSION,
            actionable_count=sum(1 for item in payload if item.kind == "actionable"),
            informational_count=sum(
                1 for item in payload if item.kind == "informational"
            ),
            recommendations=payload,
            selection_policy=SELECTION_POLICY,
        )

    def preview(
        self, dataset_id: str, version_id: str, request: CleanupPreviewRequest
    ) -> CleanupPreviewData:
        from facilio_processing.cleanup import (
            detect_plan_conflicts,
            order_steps,
            plan_fingerprint,
        )
        from facilio_processing.errors import ProcessingError
        from facilio_processing.transformations import HIGH_IMPACT_ROW_REMOVAL_THRESHOLD
        from facilio_processing.workflows import (
            preview_pipeline,
            validate_workflow,
        )

        from facilio.services.workflows import (
            _schema_from_version,
            _to_preview_step,
            _to_validation,
        )

        dataset, version, _profile = self._require_ready_profile(dataset_id, version_id)
        raw_steps = [item.model_dump() for item in request.steps]
        self._reject_unsafe_steps(raw_steps)
        conflicts = detect_plan_conflicts(raw_steps)
        if conflicts:
            raise AppError(
                "CLEANUP_CONFLICT",
                conflicts[0].message,
                status_code=409,
                details={"issues": [item.to_dict() for item in conflicts]},
            )
        ordered = order_steps(raw_steps)
        specs = _specs(ordered)
        schema = _schema_from_version(version)
        validation = validate_workflow(specs, input_schema=schema)
        payload = _to_validation(validation)
        if not validation.valid:
            raise AppError(
                "CLEANUP_INVALID",
                "These cleanup steps are not valid for this version.",
                status_code=400,
                details=payload.model_dump(mode="json"),
            )
        frame = load_version_frame(self._storage, dataset, version)
        quality_before = None
        with self._database.session_scope() as session:
            quality_before = _quality_score(session, version.id)
        try:
            result_frame, pipeline = preview_pipeline(frame, specs)
        except ProcessingError as error:
            raise AppError(
                "CLEANUP_PREVIEW_FAILED",
                error.message,
                status_code=400,
                details=error.details,
            ) from error
        if pipeline.failed:
            raise AppError(
                pipeline.error_code or "CLEANUP_PREVIEW_FAILED",
                pipeline.error_message or "Preview could not finish.",
                status_code=400,
            )
        fingerprint = plan_fingerprint(str(version.id), ordered)
        changed = sum(
            (item.impact.changed_cell_count if item.impact else 0)
            for item in pipeline.steps
        )
        warnings = [
            warning for item in pipeline.steps for warning in (item.warnings or ())
        ]
        removed_rows = pipeline.rows_before - pipeline.rows_after
        high_impact = (
            pipeline.rows_before > 0
            and removed_rows / pipeline.rows_before >= HIGH_IMPACT_ROW_REMOVAL_THRESHOLD
        )
        examples: list[CleanupPreviewExample] = []
        for item in pipeline.steps:
            for example in item.examples:
                examples.append(
                    CleanupPreviewExample(
                        **asdict(example),
                        step_position=item.position,
                        operation_code=item.operation_code,
                    )
                )
        projected = _projected_quality(result_frame, quality_before)
        logger.info(
            "guided cleanup previewed dataset_id=%s version_id=%s steps=%s no_op=%s",
            dataset.id,
            version.id,
            len(ordered),
            pipeline.no_op,
        )
        return CleanupPreviewData(
            dataset_id=dataset.id,
            input_version_id=version.id,
            input_version_number=version.version_number,
            plan_fingerprint=fingerprint,
            no_op=pipeline.no_op,
            high_impact=high_impact,
            rows_before=pipeline.rows_before,
            rows_after=pipeline.rows_after,
            columns_before=pipeline.columns_before,
            columns_after=pipeline.columns_after,
            changed_cell_count=changed,
            removed_row_count=max(0, removed_rows),
            removed_column_count=max(
                0, pipeline.columns_before - pipeline.columns_after
            ),
            warnings=warnings,
            steps=[_to_preview_step(item) for item in pipeline.steps],
            examples=examples[:40],
            projected_quality=projected,
            validation=payload,
            duration_ms=pipeline.duration_ms,
        )

    def apply(
        self, dataset_id: str, version_id: str, request: CleanupApplyRequest
    ) -> CleanupApplyData:
        from facilio_processing.cleanup import (
            detect_plan_conflicts,
            order_steps,
            plan_fingerprint,
        )
        from facilio_processing.transformations import HIGH_IMPACT_ROW_REMOVAL_THRESHOLD
        from facilio_processing.workflows import (
            snapshot_steps,
            validate_workflow,
        )

        from facilio.services.workflows import _schema_from_version, _to_validation

        dataset, version, _profile = self._require_ready_profile(dataset_id, version_id)
        raw_steps = [item.model_dump() for item in request.steps]
        self._reject_unsafe_steps(raw_steps)
        conflicts = detect_plan_conflicts(raw_steps)
        if conflicts:
            raise AppError(
                "CLEANUP_CONFLICT",
                conflicts[0].message,
                status_code=409,
                details={"issues": [item.to_dict() for item in conflicts]},
            )
        ordered = order_steps(raw_steps)
        expected = plan_fingerprint(str(version.id), ordered)
        if expected != request.plan_fingerprint:
            raise AppError(
                "CLEANUP_STALE",
                "This preview no longer matches the selected cleanup. Preview again.",
                status_code=409,
            )
        specs = _specs(ordered)
        schema = _schema_from_version(version)
        validation = validate_workflow(specs, input_schema=schema)
        if not validation.valid:
            raise AppError(
                "CLEANUP_INVALID",
                "These cleanup steps are not valid for this version.",
                status_code=400,
                details=_to_validation(validation).model_dump(mode="json"),
            )

        from facilio_processing.errors import ProcessingError
        from facilio_processing.workflows import preview_pipeline

        frame = load_version_frame(self._storage, dataset, version)
        try:
            _result_frame, pipeline = preview_pipeline(frame, specs)
        except ProcessingError as error:
            raise AppError(
                "CLEANUP_PREVIEW_FAILED",
                error.message,
                status_code=400,
                details=error.details,
            ) from error
        if pipeline.failed:
            raise AppError(
                pipeline.error_code or "CLEANUP_PREVIEW_FAILED",
                pipeline.error_message or "The cleanup could not be checked.",
                status_code=400,
            )
        if pipeline.no_op:
            raise AppError(
                "CLEANUP_NOOP",
                "These cleanup steps would not change this version.",
                status_code=409,
            )
        removed_rows = pipeline.rows_before - pipeline.rows_after
        high_impact = (
            pipeline.rows_before > 0
            and removed_rows / pipeline.rows_before >= HIGH_IMPACT_ROW_REMOVAL_THRESHOLD
        )
        if high_impact and not request.acknowledge_high_impact:
            raise AppError(
                "CLEANUP_HIGH_IMPACT",
                (
                    f"This cleanup will remove {removed_rows} of "
                    f"{pipeline.rows_before} rows. Confirm that you want to continue. "
                    "Your original remains unchanged."
                ),
                status_code=409,
                details={
                    "removed_row_count": removed_rows,
                    "rows_before": pipeline.rows_before,
                },
            )

        self._reject_in_flight(dataset.id, version.id)
        quality_before = None
        with self._database.session_scope() as session:
            quality_before = _quality_score(session, version.id)

        run_id = uuid.uuid4()
        job_id = uuid.uuid4()
        snapshot = {
            "workflow_id": None,
            "name": "Guided cleanup",
            "revision": 1,
            "origin": "GUIDED_CLEANUP",
            "plan_fingerprint": expected,
            "steps": snapshot_steps(specs),
        }
        from datetime import UTC, datetime

        queued_at = datetime.now(UTC)
        with self._database.session_scope() as session:
            run = WorkflowRun(
                id=run_id,
                workflow_id=None,
                workflow_revision=1,
                workflow_snapshot=snapshot,
                input_dataset_id=dataset.id,
                input_version_id=version.id,
                output_version_id=None,
                status="QUEUED",
                quality_before=quality_before,
            )
            WorkflowRunRepository(session).add(run)
            for spec in specs:
                session.add(
                    WorkflowStepRun(
                        workflow_run_id=run_id,
                        workflow_step_id=_maybe_uuid(spec.id),
                        step_snapshot={
                            "id": spec.id,
                            "position": spec.position,
                            "operation_code": spec.operation_code,
                            "parameters": dict(spec.parameters or {}),
                        },
                        position=spec.position,
                        operation_code=spec.operation_code,
                        status="PENDING",
                    )
                )
            job = Job(
                id=job_id,
                job_type="WORKFLOW_RUN",
                status=state.QUEUED,
                workflow_run_id=run_id,
                workflow_id=None,
                dataset_id=dataset.id,
                input_version_id=version.id,
                queue_name=self._settings.JOB_QUEUE_NAME,
                attempt_count=0,
                max_attempts=self._settings.MAX_JOB_ATTEMPTS,
                progress_current=0,
                progress_total=len(specs),
                current_activity="Waiting to start",
                queued_at=queued_at,
                request_id=get_request_id(),
                retryable=False,
            )
            session.add(job)
            session.flush()

        JobExecutor(self._settings, self._database).execute(str(job_id))
        logger.info(
            "guided cleanup executed dataset_id=%s version_id=%s job_id=%s run_id=%s",
            dataset.id,
            version.id,
            job_id,
            run_id,
        )
        from facilio.jobs.queue import MemoryJobQueue

        jobs = JobService(self._settings, self._database, MemoryJobQueue())
        job_payload = jobs.get_job(str(job_id))
        run_payload = self._load_run(str(run_id), dataset.name, version.version_number)
        failed = job_payload.status in {"FAILED", "CANCELLED"}
        if failed and run_payload.output_version_id is None:
            raise AppError(
                job_payload.error_code or "CLEANUP_FAILED",
                job_payload.error_message_safe
                or ("We couldn't finish this cleanup. No cleaned version was created."),
                status_code=400,
                details={
                    "job_id": str(job_id),
                    "workflow_run_id": str(run_id),
                    "input_unchanged": True,
                },
            )
        impact = TransformationImpactData(
            rows_before=pipeline.rows_before,
            rows_after=pipeline.rows_after,
            columns_before=pipeline.columns_before,
            columns_after=pipeline.columns_after,
            changed_cell_count=sum(
                item.impact.changed_cell_count if item.impact else 0
                for item in pipeline.steps
            ),
            removed_row_count=max(0, pipeline.rows_before - pipeline.rows_after),
            removed_column_count=max(
                0, pipeline.columns_before - pipeline.columns_after
            ),
            affected_row_count=sum(
                item.impact.affected_row_count if item.impact else 0
                for item in pipeline.steps
            ),
            no_op=False,
        )
        profile_status = None
        if run_payload.output_version_id:
            with self._database.session_scope() as session:
                child = VersionRepository(session).get(run_payload.output_version_id)
                if child is not None:
                    profile_status = child.profile_status
        return CleanupApplyData(
            dataset_id=dataset.id,
            input_version_id=version.id,
            input_version_number=version.version_number,
            output_version_id=run_payload.output_version_id,
            output_version_number=run_payload.output_version_number,
            plan_fingerprint=expected,
            impact=impact,
            quality_delta=run_payload.quality_delta,
            profile_status=profile_status,
            job=JobSummary.model_validate(job_payload.model_dump()),
            workflow_run=run_payload,
        )

    def _require_ready_profile(self, dataset_id: str, version_id: str):
        dataset_uuid = _parse_uuid(dataset_id, DatasetNotFoundError)
        version_uuid = _parse_uuid(version_id, VersionNotFoundError)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(dataset_uuid)
            if dataset is None:
                raise DatasetNotFoundError
            if dataset.status != "ready":
                raise AppError(
                    "INGESTION_FAILED",
                    "This dataset is not available for cleanup.",
                    status_code=409,
                )
            version = VersionRepository(session).get_for_dataset(
                dataset_uuid, version_uuid
            )
            if version is None:
                raise VersionNotFoundError
            profile = ProfileRepository(session).get_for_version(version_uuid)
            if profile is None:
                raise ProfileNotFoundError
            if profile.status != "READY":
                raise ProfileNotReadyError(
                    "Analyze this version before starting Guided Cleanup."
                )
            _ = list(profile.issues)
            _ = list(profile.columns)
            return dataset, version, profile

    def _reject_unsafe_steps(self, steps: list[dict[str, Any]]) -> None:
        from facilio_processing.transformations.catalog import get_operation
        from facilio_processing.transformations.errors import (
            UnsupportedTransformationError,
        )

        for item in steps:
            code = str(item.get("operation_code") or "").strip().upper()
            item["operation_code"] = code
            if code not in _GUIDED_CODES:
                raise AppError(
                    "UNSUPPORTED_TRANSFORMATION",
                    f'"{code}" is not available in Guided Cleanup.',
                    status_code=400,
                    details={"operation": code},
                )
            try:
                operation = get_operation(code)
            except UnsupportedTransformationError as error:
                raise AppError(
                    "UNSUPPORTED_TRANSFORMATION",
                    error.message,
                    status_code=400,
                    details=error.details,
                ) from error
            allowed = {spec.name for spec in operation.parameters}
            extra = [
                key for key in (item.get("parameters") or {}) if key not in allowed
            ]
            if extra:
                raise AppError(
                    "INVALID_TRANSFORMATION_PARAMETERS",
                    "Unexpected cleanup parameters were rejected.",
                    status_code=400,
                    details={"fields": extra, "operation": code},
                )

    def _reject_in_flight(self, dataset_id: uuid.UUID, version_id: uuid.UUID) -> None:
        with self._database.session_scope() as session:
            jobs = JobRepository(session).list_page(
                page=1,
                page_size=20,
                dataset_id=dataset_id,
            )[0]
            for job in jobs:
                if job.input_version_id != version_id:
                    continue
                if job.status not in {
                    state.QUEUED,
                    state.RUNNING,
                    state.CANCEL_REQUESTED,
                }:
                    continue
                # One-off Guided Cleanup jobs have no saved workflow. A queued
                # saved Cleanup/Workflow must not block this session.
                if job.workflow_id is not None:
                    continue
                raise AppError(
                    "CLEANUP_IN_PROGRESS",
                    "A cleanup is already running on this version.",
                    status_code=409,
                )

    def _load_run(
        self, run_id: str, dataset_name: str, input_number: int
    ) -> WorkflowRunDetail:
        from facilio.services.workflows import WorkflowService

        service = WorkflowService(self._settings, self._database)
        payload = service.get_run(run_id)
        if payload.input_dataset_name is None:
            payload = payload.model_copy(update={"input_dataset_name": dataset_name})
        if payload.input_version_number is None:
            payload = payload.model_copy(update={"input_version_number": input_number})
        return payload


def _specs(steps: list[dict[str, Any]]):
    from facilio_processing.workflows import WorkflowStepSpec

    specs = []
    for item in steps:
        rec = str(item.get("recommendation_id") or item.get("operation_code"))
        identity = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{rec}:{item['position']}"))
        specs.append(
            WorkflowStepSpec(
                id=identity,
                position=int(item["position"]),
                operation_code=str(item["operation_code"]),
                parameters=dict(item.get("parameters") or {}),
                enabled=True,
            )
        )
    return specs


def _projected_quality(frame, quality_before: float | None) -> QualityDeltaData | None:
    try:
        from facilio_processing import profile_table

        _profile, quality = profile_table(frame)
        after = quality.overall_score
        delta = None
        if quality_before is not None and after is not None:
            delta = round(after - quality_before, 1)
        return QualityDeltaData(
            before=quality_before,
            after=after,
            delta=delta,
            dimensions=[
                QualityDeltaDimension(
                    key=item.key,
                    label=item.label,
                    before=None,
                    after=item.score,
                    delta=None,
                )
                for item in quality.dimensions
            ],
        )
    except Exception:
        logger.info("guided cleanup preview profile skipped")
        return None


def _quality_score(session, version_id: uuid.UUID) -> float | None:
    row = ProfileRepository(session).get_for_version(version_id)
    if row is None or row.status != "READY":
        return None
    return row.overall_score


def _parse_uuid(value: str, error_cls: type[AppError]):
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise error_cls() from None


def _maybe_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        return None
