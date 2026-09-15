"""Reusable linear workflow orchestration.

Flask routes validate, preview, and dispatch runs. A worker invokes
`execute_pipeline`, which calls the Phase 5 transformation engine once per
enabled step. A successful run persists exactly one derived DatasetVersion.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import UTC, datetime
from typing import Any

from facilio.core.config import Settings
from facilio.core.errors import (
    AppError,
    DatasetNotFoundError,
    WorkflowNotFoundError,
    WorkflowRunNotFoundError,
    WorkflowStepNotFoundError,
)
from facilio.core.logging import get_logger
from facilio.core.pagination import parse_page
from facilio.core.request_id import get_request_id
from facilio.db.session import Database
from facilio.jobs import classify, state
from facilio.jobs.queue import JobQueue, MemoryJobQueue
from facilio.models.job import Job
from facilio.models.version import DatasetVersion
from facilio.models.workflow import Workflow, WorkflowRun, WorkflowStep, WorkflowStepRun
from facilio.repositories.dataset import DatasetRepository
from facilio.repositories.profile import ProfileRepository
from facilio.repositories.version import TransformationRepository, VersionRepository
from facilio.repositories.workflow import (
    WorkflowRepository,
    WorkflowRunRepository,
    WorkflowStepRepository,
)
from facilio.schemas.jobs import WorkflowRunAccepted
from facilio.schemas.transformations import (
    ChangeExampleData,
    QualityDeltaData,
    QualityDeltaDimension,
    TransformationImpactData,
    WorkspaceStatsData,
)
from facilio.schemas.workflows import (
    CompatibilityData,
    ContractColumnData,
    CreateStepRequest,
    CreateWorkflowRequest,
    PatchStepRequest,
    PatchWorkflowRequest,
    ReorderStepsRequest,
    SchemaColumnData,
    StepValidationData,
    ValidationIssueData,
    WorkflowDetail,
    WorkflowInputRequest,
    WorkflowListData,
    WorkflowPreviewData,
    WorkflowPreviewStepData,
    WorkflowRunDetail,
    WorkflowRunListData,
    WorkflowRunSummary,
    WorkflowStepData,
    WorkflowStepRunData,
    WorkflowSummary,
    WorkflowValidationData,
)
from facilio.services.frames import load_version_frame
from facilio.storage.local import LocalStorageService

logger = get_logger("facilio.workflows")


class WorkflowService:
    def __init__(
        self,
        settings: Settings,
        database: Database,
        queue: JobQueue | None = None,
    ) -> None:
        self._settings = settings
        self._database = database
        self._storage = LocalStorageService(settings.upload_root_path())
        self._queue = queue or MemoryJobQueue()

    def list_workflows(
        self, *, page: int, page_size: int, include_archived: bool = False
    ) -> WorkflowListData:
        page, page_size = parse_page(page, page_size)
        with self._database.session_scope() as session:
            items, total = WorkflowRepository(session).list_page(
                page=page, page_size=page_size, include_archived=include_archived
            )
            run_repo = WorkflowRunRepository(session)
            summaries: list[WorkflowSummary] = []
            for item in items:
                last_status = _last_run_status(run_repo, item.id)
                summaries.append(_to_summary(item, last_status))
            return WorkflowListData(
                items=summaries, page=page, page_size=page_size, total=total
            )

    def create_workflow(self, request: CreateWorkflowRequest) -> WorkflowDetail:
        with self._database.session_scope() as session:
            workflow = Workflow(
                name=request.name.strip(),
                description=_clean_description(request.description),
                status="DRAFT",
                revision=1,
            )
            WorkflowRepository(session).add(workflow)
            session.flush()
            if len(request.steps) > self._settings.MAX_WORKFLOW_STEPS:
                raise AppError(
                    "WORKFLOW_STEP_LIMIT",
                    _step_limit_message(self._settings.MAX_WORKFLOW_STEPS),
                    status_code=409,
                )
            for index, seed in enumerate(request.steps):
                _require_operation(seed.operation_code)
                WorkflowStepRepository(session).add(
                    WorkflowStep(
                        workflow_id=workflow.id,
                        position=index,
                        operation_code=seed.operation_code.strip().upper(),
                        parameters_json=dict(seed.parameters or {}),
                        enabled=seed.enabled,
                    )
                )
            stored = WorkflowRepository(session).get(workflow.id)
            assert stored is not None
            stored.status = _status_from_steps(stored.steps)
            WorkflowRepository(session).save(stored)
            logger.info("workflow created workflow_id=%s", stored.id)
            return _to_detail(stored, None)

    def get_workflow(self, workflow_id: str) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = WorkflowRepository(session).get(identity)
            if workflow is None:
                raise WorkflowNotFoundError
            last_status = _last_run_status(WorkflowRunRepository(session), workflow.id)
            return _to_detail(workflow, last_status)

    def patch_workflow(
        self, workflow_id: str, request: PatchWorkflowRequest
    ) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = _require_workflow(session, identity)
            _check_revision(workflow, request.expected_revision)
            if request.name is not None:
                workflow.name = request.name.strip()
            if request.description is not None:
                workflow.description = _clean_description(request.description)
            WorkflowRepository(session).save(workflow)
            last_status = _last_run_status(WorkflowRunRepository(session), workflow.id)
            return _to_detail(workflow, last_status)

    def delete_workflow(self, workflow_id: str) -> dict[str, Any]:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = _require_workflow(session, identity)
            runs = WorkflowRunRepository(session).count_for_workflow(identity)
            if runs > 0:
                workflow.status = "ARCHIVED"
                WorkflowRepository(session).save(workflow)
                logger.info("workflow archived workflow_id=%s", identity)
                return {"id": str(identity), "deleted": False, "archived": True}
            WorkflowRepository(session).delete(workflow)
            logger.info("workflow deleted workflow_id=%s", identity)
            return {"id": str(identity), "deleted": True, "archived": False}

    def archive_workflow(self, workflow_id: str) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = _require_workflow(session, identity)
            workflow.status = "ARCHIVED"
            WorkflowRepository(session).save(workflow)
            last_status = _last_run_status(WorkflowRunRepository(session), workflow.id)
            return _to_detail(workflow, last_status)

    def restore_workflow(self, workflow_id: str) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = _require_workflow(session, identity)
            if workflow.status != "ARCHIVED":
                raise AppError(
                    "WORKFLOW_INVALID",
                    "Only archived workflows can be restored.",
                    status_code=409,
                )
            workflow.status = _status_from_steps(workflow.steps)
            WorkflowRepository(session).save(workflow)
            last_status = _last_run_status(WorkflowRunRepository(session), workflow.id)
            return _to_detail(workflow, last_status)

    def duplicate_workflow(self, workflow_id: str) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            source = _require_workflow(session, identity)
            copy = Workflow(
                name=_copy_name(source.name),
                description=source.description,
                revision=1,
                status="DRAFT",
            )
            WorkflowRepository(session).add(copy)
            for step in sorted(source.steps, key=lambda item: item.position):
                WorkflowStepRepository(session).add(
                    WorkflowStep(
                        workflow_id=copy.id,
                        position=step.position,
                        operation_code=step.operation_code,
                        parameters_json=dict(step.parameters_json or {}),
                        enabled=step.enabled,
                    )
                )
            copy = WorkflowRepository(session).get(copy.id)
            assert copy is not None
            copy.status = _status_from_steps(copy.steps)
            WorkflowRepository(session).save(copy)
            logger.info(
                "workflow duplicated source_id=%s workflow_id=%s", identity, copy.id
            )
            return _to_detail(copy, None)

    def add_step(self, workflow_id: str, request: CreateStepRequest) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        _require_operation(request.operation_code)
        with self._database.session_scope() as session:
            workflow = _require_editable(session, identity)
            _check_revision(workflow, request.expected_revision)
            enabled_count = sum(1 for item in workflow.steps if item.enabled)
            if request.enabled and enabled_count >= self._settings.MAX_WORKFLOW_STEPS:
                raise AppError(
                    "WORKFLOW_STEP_LIMIT",
                    _step_limit_message(self._settings.MAX_WORKFLOW_STEPS),
                    status_code=409,
                )
            position = 0
            if workflow.steps:
                position = max(item.position for item in workflow.steps) + 1
            WorkflowStepRepository(session).add(
                WorkflowStep(
                    workflow_id=workflow.id,
                    position=position,
                    operation_code=request.operation_code.strip().upper(),
                    parameters_json=dict(request.parameters or {}),
                    enabled=request.enabled,
                )
            )
            workflow = WorkflowRepository(session).get(identity)
            assert workflow is not None
            _bump_revision(workflow)
            workflow.status = _status_from_steps(workflow.steps)
            WorkflowRepository(session).save(workflow)
            return _saved_detail(session, workflow)

    def patch_step(
        self, workflow_id: str, step_id: str, request: PatchStepRequest
    ) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        step_uuid = _parse_step(step_id)
        with self._database.session_scope() as session:
            workflow = _require_editable(session, identity)
            _check_revision(workflow, request.expected_revision)
            step = WorkflowStepRepository(session).get(identity, step_uuid)
            if step is None:
                raise WorkflowStepNotFoundError
            changed = False
            if request.operation_code is not None:
                _require_operation(request.operation_code)
                code = request.operation_code.strip().upper()
                if code != step.operation_code:
                    step.operation_code = code
                    changed = True
            if request.parameters is not None:
                step.parameters_json = dict(request.parameters)
                changed = True
            if request.enabled is not None and request.enabled != step.enabled:
                if request.enabled:
                    enabled_count = sum(1 for item in workflow.steps if item.enabled)
                    if enabled_count >= self._settings.MAX_WORKFLOW_STEPS:
                        raise AppError(
                            "WORKFLOW_STEP_LIMIT",
                            _step_limit_message(self._settings.MAX_WORKFLOW_STEPS),
                            status_code=409,
                        )
                step.enabled = request.enabled
                changed = True
            if changed:
                step.updated_at = datetime.now(UTC)
                _bump_revision(workflow)
            workflow.status = _status_from_steps(workflow.steps)
            WorkflowRepository(session).save(workflow)
            return _saved_detail(session, workflow)

    def delete_step(self, workflow_id: str, step_id: str) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        step_uuid = _parse_step(step_id)
        with self._database.session_scope() as session:
            workflow = _require_editable(session, identity)
            step = WorkflowStepRepository(session).get(identity, step_uuid)
            if step is None:
                raise WorkflowStepNotFoundError
            WorkflowStepRepository(session).delete(step)
            remaining = sorted(
                [item for item in workflow.steps if item.id != step_uuid],
                key=lambda item: item.position,
            )
            for index, item in enumerate(remaining):
                item.position = index + 1000
            session.flush()
            for index, item in enumerate(remaining):
                item.position = index
            _bump_revision(workflow)
            workflow.status = _status_from_steps(remaining)
            WorkflowRepository(session).save(workflow)
            return _saved_detail(session, workflow)

    def reorder_steps(
        self, workflow_id: str, request: ReorderStepsRequest
    ) -> WorkflowDetail:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = _require_editable(session, identity)
            _check_revision(workflow, request.expected_revision)
            current_ids = {item.id for item in workflow.steps}
            ordered_ids = list(request.step_ids)
            if set(ordered_ids) != current_ids or len(ordered_ids) != len(current_ids):
                raise AppError(
                    "WORKFLOW_REORDER_INVALID",
                    "Reorder must include each step exactly once.",
                    status_code=400,
                )
            by_id = {item.id: item for item in workflow.steps}
            for index, step_id in enumerate(ordered_ids):
                by_id[step_id].position = index + 1000
            session.flush()
            for index, step_id in enumerate(ordered_ids):
                by_id[step_id].position = index
                by_id[step_id].updated_at = datetime.now(UTC)
            _bump_revision(workflow)
            workflow.status = _status_from_steps(workflow.steps)
            WorkflowRepository(session).save(workflow)
            return _saved_detail(session, workflow)

    def validate(
        self, workflow_id: str, request: WorkflowInputRequest | None
    ) -> WorkflowValidationData:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = _require_workflow(session, identity)
            specs = _to_specs(workflow.steps)
            schema = None
            if request is not None:
                _dataset, version = self._require_input(
                    session, request.dataset_id, request.version_id
                )
                schema = _schema_from_version(version)
        from facilio_processing.workflows import validate_workflow

        result = validate_workflow(specs, input_schema=schema)
        return _to_validation(result)

    def preview(
        self, workflow_id: str, request: WorkflowInputRequest
    ) -> WorkflowPreviewData:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = _require_workflow(session, identity)
            if workflow.status == "ARCHIVED":
                raise AppError(
                    "WORKFLOW_ARCHIVED",
                    "Archived workflows cannot be previewed until they are restored.",
                    status_code=409,
                )
            dataset, version = self._require_input(
                session, request.dataset_id, request.version_id
            )
            specs = _to_specs(workflow.steps)
            schema = _schema_from_version(version)
            frame = load_version_frame(self._storage, dataset, version)
            quality_before = _quality_score(session, version.id)
        from facilio_processing.errors import ProcessingError
        from facilio_processing.workflows import preview_pipeline, validate_workflow

        validation = validate_workflow(specs, input_schema=schema)
        payload = _to_validation(validation)
        if not validation.valid:
            raise AppError(
                "WORKFLOW_INVALID",
                "The workflow is not valid for the selected dataset version.",
                status_code=400,
                details=payload.model_dump(mode="json"),
            )
        try:
            _result_frame, pipeline = preview_pipeline(frame, specs)
        except ProcessingError as error:
            raise AppError(
                "WORKFLOW_PREVIEW_FAILED",
                error.message,
                status_code=400,
                details=error.details,
            ) from error
        projected = None
        try:
            from facilio_processing import profile_table

            _profile, quality = profile_table(_result_frame)
            after = quality.overall_score
            delta = None
            if quality_before is not None and after is not None:
                delta = round(after - quality_before, 1)
            projected = QualityDeltaData(
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
            logger.info(
                "workflow preview profile skipped workflow_id=%s version_id=%s",
                identity,
                request.version_id,
            )
        logger.info(
            "workflow previewed workflow_id=%s version_id=%s",
            identity,
            request.version_id,
        )
        return WorkflowPreviewData(
            validation=payload,
            no_op=pipeline.no_op,
            rows_before=pipeline.rows_before,
            rows_after=pipeline.rows_after,
            columns_before=pipeline.columns_before,
            columns_after=pipeline.columns_after,
            steps=[_to_preview_step(item) for item in pipeline.steps],
            projected_quality=projected,
            duration_ms=pipeline.duration_ms,
        )

    def run(
        self, workflow_id: str, request: WorkflowInputRequest
    ) -> WorkflowRunAccepted:
        """Validate, persist a queued run/job, and enqueue. Does not execute pandas."""
        return self.dispatch_run(workflow_id, request)

    def dispatch_run(
        self, workflow_id: str, request: WorkflowInputRequest
    ) -> WorkflowRunAccepted:
        identity = _parse_workflow(workflow_id)
        with self._database.session_scope() as session:
            workflow = _require_workflow(session, identity)
            if workflow.status == "ARCHIVED":
                raise AppError(
                    "WORKFLOW_ARCHIVED",
                    "Archived workflows cannot be executed until they are restored.",
                    status_code=409,
                )
            dataset, version = self._require_input(
                session, request.dataset_id, request.version_id
            )
            snapshot = _workflow_snapshot(workflow)
            specs = _to_specs(workflow.steps)
            schema = _schema_from_version(version)
            quality_before = _quality_score(session, version.id)
            dataset_name = dataset.name
            input_number = version.version_number
            dataset_uuid = dataset.id
            version_uuid = version.id
            revision = workflow.revision
            workflow_name = workflow.name
            enabled = [item for item in workflow.steps if item.enabled]
        from facilio_processing.workflows import validate_workflow

        validation = validate_workflow(specs, input_schema=schema)
        if not validation.valid:
            code = "WORKFLOW_INVALID"
            if validation.empty:
                code = "WORKFLOW_EMPTY"
            elif (
                validation.compatibility is not None
                and not validation.compatibility.compatible
            ):
                code = "WORKFLOW_INCOMPATIBLE"
            raise AppError(
                code,
                "The workflow cannot run against the selected dataset version.",
                status_code=400,
                details=_to_validation(validation).model_dump(mode="json"),
            )
        run_id = uuid.uuid4()
        job_id = uuid.uuid4()
        queued_at = datetime.now(UTC)
        with self._database.session_scope() as session:
            run = WorkflowRun(
                id=run_id,
                workflow_id=identity,
                workflow_revision=revision,
                workflow_snapshot=snapshot,
                input_dataset_id=dataset_uuid,
                input_version_id=version_uuid,
                output_version_id=None,
                status="QUEUED",
                started_at=None,
                completed_at=None,
                duration_ms=None,
                quality_before=quality_before,
                quality_after=None,
            )
            WorkflowRunRepository(session).add(run)
            for item in sorted(enabled, key=lambda step: step.position):
                session.add(
                    WorkflowStepRun(
                        workflow_run_id=run_id,
                        workflow_step_id=item.id,
                        step_snapshot={
                            "id": str(item.id),
                            "position": item.position,
                            "operation_code": item.operation_code,
                            "parameters": dict(item.parameters_json or {}),
                        },
                        position=item.position,
                        operation_code=item.operation_code,
                        status="PENDING",
                    )
                )
            job = Job(
                id=job_id,
                job_type="WORKFLOW_RUN",
                status=state.QUEUED,
                workflow_run_id=run_id,
                workflow_id=identity,
                dataset_id=dataset_uuid,
                input_version_id=version_uuid,
                queue_name=self._settings.JOB_QUEUE_NAME,
                attempt_count=0,
                max_attempts=self._settings.MAX_JOB_ATTEMPTS,
                progress_current=0,
                progress_total=len(enabled),
                current_activity="Waiting for worker",
                queued_at=queued_at,
                request_id=get_request_id(),
                retryable=False,
            )
            session.add(job)
            session.flush()
        try:
            self._queue.enqueue(str(job_id))
        except AppError as error:
            with self._database.session_scope() as session:
                stored_job = session.get(Job, job_id)
                stored_run = WorkflowRunRepository(session).get(run_id)
                if stored_job is not None:
                    stored_job.status = state.FAILED
                    stored_job.error_code = "QUEUE_DISPATCH_FAILED"
                    stored_job.error_message_safe = (
                        "The run was recorded but the queue did not accept it."
                    )
                    stored_job.error_category = classify.INFRASTRUCTURE
                    stored_job.retryable = True
                    stored_job.completed_at = datetime.now(UTC)
                if stored_run is not None:
                    stored_run.status = "FAILED"
                    stored_run.completed_at = datetime.now(UTC)
                    stored_run.error_code = "QUEUE_DISPATCH_FAILED"
                    stored_run.error_message_safe = (
                        "The run was recorded but the queue did not accept it."
                    )
            raise AppError(
                "QUEUE_DISPATCH_FAILED",
                "The job was recorded but could not be queued.",
                status_code=503,
            ) from error
        logger.info(
            "workflow run queued workflow_id=%s run_id=%s job_id=%s",
            identity,
            run_id,
            job_id,
        )
        from facilio.services.jobs import JobService

        with self._database.session_scope() as session:
            stored = WorkflowRunRepository(session).get(run_id)
            if stored is None:
                raise WorkflowRunNotFoundError
            run_detail = _to_run_detail(
                stored,
                workflow_name=workflow_name,
                dataset_name=dataset_name,
                input_number=input_number,
                output_number=None,
                quality_delta=None,
            )
            job_row = session.get(Job, job_id)
            assert job_row is not None
            job_summary = JobService(
                self._settings, self._database, self._queue
            )._to_summary(session, job_row)
            return WorkflowRunAccepted(workflow_run=run_detail, job=job_summary)

    def list_runs(
        self,
        *,
        page: int,
        page_size: int,
        workflow_id: str | None = None,
        dataset_id: str | None = None,
        status: str | None = None,
    ) -> WorkflowRunListData:
        page, page_size = parse_page(page, page_size)
        wf = _parse_workflow(workflow_id) if workflow_id else None
        ds = _parse_dataset(dataset_id) if dataset_id else None
        if status is not None and status not in {
            "QUEUED",
            "RUNNING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
        }:
            raise AppError(
                "VALIDATION_ERROR",
                "Run status filter is not valid.",
                status_code=422,
            )
        with self._database.session_scope() as session:
            items, total = WorkflowRunRepository(session).list_page(
                page=page,
                page_size=page_size,
                workflow_id=wf,
                dataset_id=ds,
                status=status,
            )
            summaries = [_to_run_summary(item, session) for item in items]
            return WorkflowRunListData(
                items=summaries, page=page, page_size=page_size, total=total
            )

    def get_run(self, run_id: str) -> WorkflowRunDetail:
        identity = _parse_run(run_id)
        with self._database.session_scope() as session:
            run = WorkflowRunRepository(session).get(identity)
            if run is None:
                raise WorkflowRunNotFoundError
            name = (run.workflow.name if run.workflow else None) or str(
                run.workflow_snapshot.get("name") or "Workflow"
            )
            dataset_name = run.input_dataset.name if run.input_dataset else None
            input_number = None
            output_number = None
            if run.input_version_id:
                version = VersionRepository(session).get(run.input_version_id)
                if version is not None:
                    input_number = version.version_number
            if run.output_version_id:
                version = VersionRepository(session).get(run.output_version_id)
                if version is not None:
                    output_number = version.version_number
            delta = self._quality_delta_values(run.quality_before, run.quality_after)
            return _to_run_detail(
                run,
                workflow_name=name,
                dataset_name=dataset_name,
                input_number=input_number,
                output_number=output_number,
                quality_delta=delta,
            )

    def workspace_stats(self) -> WorkspaceStatsData:
        with self._database.session_scope() as session:
            datasets = DatasetRepository(session).count()
            derived = VersionRepository(session).count_derived()
            transforms = TransformationRepository(session).count()
            counts = ProfileRepository(session).count_current_by_status()
            workflows = WorkflowRepository(session).count_active()
            runs = WorkflowRunRepository(session)
            from facilio.jobs import state as job_state
            from facilio.repositories.job import JobRepository

            jobs = JobRepository(session)
            datasets_repo = DatasetRepository(session)
            sample_count = datasets_repo.count_samples()
            recent_rows = datasets_repo.list_recent_for_home(limit=5)
            from facilio.services.datasets import _to_summary

            return WorkspaceStatsData(
                datasets=datasets,
                derived_versions=derived,
                transformations_applied=transforms,
                datasets_analyzed=counts.get("READY", 0),
                workflow_count=workflows,
                workflow_run_count=runs.count(),
                successful_run_count=runs.count_by_status("SUCCEEDED"),
                failed_run_count=runs.count_by_status("FAILED"),
                queued_job_count=jobs.count_by_status(job_state.QUEUED),
                running_job_count=jobs.count_by_status(job_state.RUNNING),
                failed_job_count=jobs.count_by_status(job_state.FAILED),
                user_dataset_count=max(0, datasets - sample_count),
                sample_dataset_count=sample_count,
                recent_datasets=[_to_summary(item) for item in recent_rows],
            )

    def _require_input(self, session, dataset_id: uuid.UUID, version_id: uuid.UUID):
        dataset = DatasetRepository(session).get(dataset_id)
        if dataset is None:
            raise DatasetNotFoundError
        if dataset.status != "ready":
            raise AppError(
                "INGESTION_FAILED",
                "This dataset is not available for workflow execution.",
                status_code=409,
            )
        version = VersionRepository(session).get_for_dataset(dataset_id, version_id)
        if version is None:
            raise AppError(
                "WORKFLOW_INPUT_VERSION_NOT_FOUND",
                "The requested dataset version was not found.",
                status_code=404,
            )
        return dataset, version

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

    def _quality_delta_values(
        self, before: float | None, after: float | None
    ) -> QualityDeltaData | None:
        if before is None and after is None:
            return None
        delta = None
        if before is not None and after is not None:
            delta = round(after - before, 1)
        return QualityDeltaData(before=before, after=after, delta=delta, dimensions=[])


def _saved_detail(session, workflow: Workflow) -> WorkflowDetail:
    return _to_detail(
        workflow, _last_run_status(WorkflowRunRepository(session), workflow.id)
    )


def _step_limit_message(limit: int) -> str:
    return f"A workflow may include at most {limit} enabled steps."


def _require_workflow(session, identity: uuid.UUID) -> Workflow:
    workflow = WorkflowRepository(session).get(identity)
    if workflow is None:
        raise WorkflowNotFoundError
    return workflow


def _require_editable(session, identity: uuid.UUID) -> Workflow:
    workflow = _require_workflow(session, identity)
    if workflow.status == "ARCHIVED":
        raise AppError(
            "WORKFLOW_ARCHIVED",
            "Archived workflows cannot be edited until they are restored.",
            status_code=409,
        )
    return workflow


def _check_revision(workflow: Workflow, expected: int | None) -> None:
    if expected is None:
        return
    if expected != workflow.revision:
        raise AppError(
            "WORKFLOW_CONFLICT",
            "This workflow was updated elsewhere. Reload before saving.",
            status_code=409,
            details={"current_revision": workflow.revision},
        )


def _bump_revision(workflow: Workflow) -> None:
    workflow.revision += 1


def _require_operation(code: str) -> None:
    from facilio_processing.transformations.catalog import get_operation
    from facilio_processing.transformations.errors import UnsupportedTransformationError

    try:
        get_operation(code)
    except UnsupportedTransformationError as error:
        raise AppError(
            "UNSUPPORTED_TRANSFORMATION",
            error.message,
            status_code=400,
            details=error.details,
        ) from error


def _status_from_steps(steps: list[WorkflowStep]) -> str:
    from facilio_processing.workflows import validate_workflow

    result = validate_workflow(_to_specs(steps))
    if result.empty:
        return "DRAFT"
    if result.valid:
        return "READY"
    return "INVALID"


def _to_specs(steps: list[WorkflowStep]):
    from facilio_processing.workflows import WorkflowStepSpec

    return [
        WorkflowStepSpec(
            id=str(item.id),
            position=item.position,
            operation_code=item.operation_code,
            parameters=dict(item.parameters_json or {}),
            enabled=item.enabled,
        )
        for item in steps
    ]


def _schema_from_version(version: DatasetVersion):
    from facilio_processing.workflows import schema_from_columns

    return schema_from_columns(version.columns_json)


def _workflow_snapshot(workflow: Workflow) -> dict[str, Any]:
    from facilio_processing.workflows import snapshot_steps

    return {
        "workflow_id": str(workflow.id),
        "name": workflow.name,
        "revision": workflow.revision,
        "steps": snapshot_steps(_to_specs(workflow.steps)),
    }


def _quality_score(session, version_id: uuid.UUID) -> float | None:
    from facilio.repositories.profile import ProfileRepository

    row = ProfileRepository(session).get_for_version(version_id)
    if row is None or row.status != "READY":
        return None
    return row.overall_score


def _last_run_status(repo: WorkflowRunRepository, workflow_id: uuid.UUID) -> str | None:
    items, _total = repo.list_page(page=1, page_size=1, workflow_id=workflow_id)
    if not items:
        return None
    return items[0].status


def _to_summary(workflow: Workflow, last_run_status: str | None) -> WorkflowSummary:
    steps = workflow.steps
    return WorkflowSummary(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        status=workflow.status,  # type: ignore[arg-type]
        revision=workflow.revision,
        step_count=len(steps),
        enabled_step_count=sum(1 for item in steps if item.enabled),
        last_run_at=workflow.last_run_at,
        last_run_status=last_run_status,  # type: ignore[arg-type]
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


def _to_detail(workflow: Workflow, last_run_status: str | None) -> WorkflowDetail:
    steps = sorted(workflow.steps, key=lambda item: item.position)
    return WorkflowDetail(
        **_to_summary(workflow, last_run_status).model_dump(),
        steps=[_to_step(item) for item in steps],
    )


def _to_step(step: WorkflowStep) -> WorkflowStepData:
    return WorkflowStepData(
        id=step.id,
        workflow_id=step.workflow_id,
        position=step.position,
        operation_code=step.operation_code,
        parameters=dict(step.parameters_json or {}),
        enabled=step.enabled,
        created_at=step.created_at,
        updated_at=step.updated_at,
    )


def _to_validation(result) -> WorkflowValidationData:
    return WorkflowValidationData(
        valid=result.valid,
        empty=result.empty,
        issues=[
            ValidationIssueData.model_validate(item.to_dict()) for item in result.issues
        ],
        steps=[
            StepValidationData(
                step_id=uuid.UUID(item.step_id),
                position=item.position,
                operation_code=item.operation_code,
                enabled=item.enabled,
                valid=item.valid,
                schema_before=[
                    SchemaColumnData(name=col.name, dtype=col.dtype)
                    for col in item.schema_before
                ],
                schema_after=[
                    SchemaColumnData(name=col.name, dtype=col.dtype)
                    for col in item.schema_after
                ],
                issues=[
                    ValidationIssueData.model_validate(issue.to_dict())
                    for issue in item.issues
                ],
            )
            for item in result.steps
        ],
        contract=[
            ContractColumnData(
                name=item.name,
                dtype=item.dtype,
                numeric_compatible=item.numeric_compatible,
            )
            for item in result.contract.columns
        ],
        compatibility=(
            None
            if result.compatibility is None
            else CompatibilityData.model_validate(result.compatibility.to_dict())
        ),
        projected_schema=[
            SchemaColumnData(name=item.name, dtype=item.dtype)
            for item in result.projected_schema
        ],
    )


def _to_preview_step(item) -> WorkflowPreviewStepData:
    impact = None
    if item.impact is not None:
        impact = TransformationImpactData.model_validate(asdict(item.impact))
    return WorkflowPreviewStepData(
        step_id=uuid.UUID(item.step_id),
        position=item.position,
        operation_code=item.operation_code,
        parameters=dict(item.parameters),
        status=item.status,
        impact=impact,
        examples=[ChangeExampleData.model_validate(asdict(ex)) for ex in item.examples],
        warnings=list(item.warnings),
        summary=item.summary,
        duration_ms=item.duration_ms,
        error_code=item.error_code,
        error_message=item.error_message,
    )


def _to_step_run_model(
    run_id: uuid.UUID, item, started_at: datetime
) -> WorkflowStepRun:
    impact = item.impact
    warnings = "; ".join(item.warnings) if item.warnings else None
    step_uuid = None
    try:
        step_uuid = uuid.UUID(item.step_id)
    except ValueError:
        step_uuid = None
    return WorkflowStepRun(
        workflow_run_id=run_id,
        workflow_step_id=step_uuid,
        step_snapshot={
            "id": item.step_id,
            "position": item.position,
            "operation_code": item.operation_code,
            "parameters": dict(item.parameters),
        },
        position=item.position,
        operation_code=item.operation_code,
        status=item.status,
        started_at=started_at if item.status != "SKIPPED" else None,
        completed_at=datetime.now(UTC) if item.status != "SKIPPED" else None,
        duration_ms=item.duration_ms,
        rows_before=None if impact is None else impact.rows_before,
        rows_after=None if impact is None else impact.rows_after,
        columns_before=None if impact is None else impact.columns_before,
        columns_after=None if impact is None else impact.columns_after,
        changed_cells=None if impact is None else impact.changed_cell_count,
        removed_rows=None if impact is None else impact.removed_row_count,
        removed_columns=None if impact is None else impact.removed_column_count,
        warning_summary=warnings,
        error_code=item.error_code,
        error_message_safe=item.error_message,
    )


def _to_run_summary(run: WorkflowRun, session) -> WorkflowRunSummary:
    name = (run.workflow.name if run.workflow else None) or str(
        run.workflow_snapshot.get("name") or "Workflow"
    )
    dataset_name = run.input_dataset.name if run.input_dataset else None
    input_number = None
    output_number = None
    versions = VersionRepository(session)
    if run.input_version_id:
        version = versions.get(run.input_version_id)
        if version is not None:
            input_number = version.version_number
    if run.output_version_id:
        version = versions.get(run.output_version_id)
        if version is not None:
            output_number = version.version_number
    return WorkflowRunSummary(
        id=run.id,
        workflow_id=run.workflow_id,
        workflow_name=name,
        workflow_revision=run.workflow_revision,
        input_dataset_id=run.input_dataset_id,
        input_dataset_name=dataset_name,
        input_version_id=run.input_version_id,
        output_version_id=run.output_version_id,
        input_version_number=input_number,
        output_version_number=output_number,
        status=run.status,  # type: ignore[arg-type]
        step_count=len(run.step_runs),
        started_at=run.started_at,
        completed_at=run.completed_at,
        duration_ms=run.duration_ms,
        error_code=run.error_code,
        error_message_safe=run.error_message_safe,
        quality_before=run.quality_before,
        quality_after=run.quality_after,
    )


def _to_run_detail(
    run: WorkflowRun,
    *,
    workflow_name: str,
    dataset_name: str | None,
    input_number: int | None,
    output_number: int | None,
    quality_delta: QualityDeltaData | None,
) -> WorkflowRunDetail:
    return WorkflowRunDetail(
        id=run.id,
        workflow_id=run.workflow_id,
        workflow_name=workflow_name,
        workflow_revision=run.workflow_revision,
        input_dataset_id=run.input_dataset_id,
        input_dataset_name=dataset_name,
        input_version_id=run.input_version_id,
        output_version_id=run.output_version_id,
        input_version_number=input_number,
        output_version_number=output_number,
        status=run.status,  # type: ignore[arg-type]
        step_count=len(run.step_runs),
        started_at=run.started_at,
        completed_at=run.completed_at,
        duration_ms=run.duration_ms,
        error_code=run.error_code,
        error_message_safe=run.error_message_safe,
        quality_before=run.quality_before,
        quality_after=run.quality_after,
        workflow_snapshot=dict(run.workflow_snapshot or {}),
        step_runs=[_to_step_run(item) for item in run.step_runs],
        quality_delta=quality_delta,
    )


def _to_step_run(row: WorkflowStepRun) -> WorkflowStepRunData:
    return WorkflowStepRunData(
        id=row.id,
        workflow_run_id=row.workflow_run_id,
        workflow_step_id=row.workflow_step_id,
        position=row.position,
        operation_code=row.operation_code,
        status=row.status,  # type: ignore[arg-type]
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


def _parse_workflow(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise WorkflowNotFoundError from None


def _parse_step(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise WorkflowStepNotFoundError from None


def _parse_run(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise WorkflowRunNotFoundError from None


def _parse_dataset(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise DatasetNotFoundError from None


def _clean_description(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _copy_name(name: str) -> str:
    suffix = " — Copy"
    if name.endswith(suffix):
        return name
    combined = f"{name}{suffix}"
    return combined[:200]
