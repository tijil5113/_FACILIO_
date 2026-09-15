"""Immutable transformation orchestration.

Flask routes do not execute pandas operations. This service validates,
previews, persists derived versions, and records lineage.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict
from typing import Any

from sqlalchemy.exc import IntegrityError

from facilio.core.config import Settings
from facilio.core.errors import (
    AppError,
    DatasetNotFoundError,
    VersionNotFoundError,
)
from facilio.core.logging import get_logger
from facilio.db.session import Database
from facilio.models.dataset import Dataset
from facilio.models.version import DatasetVersion, Transformation
from facilio.repositories.dataset import DatasetRepository
from facilio.repositories.version import TransformationRepository, VersionRepository
from facilio.schemas.datasets import DatasetColumn, DatasetPreviewData
from facilio.schemas.transformations import (
    ChangeExampleData,
    DatasetVersionDetail,
    DatasetVersionSummary,
    LineageData,
    LineageNodeData,
    QualityDeltaData,
    QualityDeltaDimension,
    SetCurrentVersionRequest,
    TransformationApplyData,
    TransformationImpactData,
    TransformationPreviewData,
    TransformationRecordData,
    TransformationRequest,
    VersionComparisonData,
    WorkspaceStatsData,
)
from facilio.services.frames import load_version_frame, write_derived_table
from facilio.storage.local import LocalStorageService

logger = get_logger("facilio.transformations")


class TransformationService:
    def __init__(self, settings: Settings, database: Database) -> None:
        self._settings = settings
        self._database = database
        self._storage = LocalStorageService(settings.upload_root_path())

    def catalog(self) -> list[dict[str, Any]]:
        from facilio_processing.transformations import catalog

        return catalog()

    def list_versions(self, dataset_id: str) -> list[DatasetVersionSummary]:
        identity = _parse_dataset(dataset_id)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(identity)
            if dataset is None:
                raise DatasetNotFoundError
            versions = VersionRepository(session).list_for_dataset(identity)
            current_id = dataset.current_version_id
            return [_to_version_summary(item, current_id) for item in versions]

    def get_version(self, dataset_id: str, version_id: str) -> DatasetVersionDetail:
        dataset_uuid = _parse_dataset(dataset_id)
        version_uuid = _parse_version(version_id)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(dataset_uuid)
            if dataset is None:
                raise DatasetNotFoundError
            version = VersionRepository(session).get_for_dataset(
                dataset_uuid, version_uuid
            )
            if version is None:
                raise VersionNotFoundError
            return _to_version_detail(version, dataset.current_version_id)

    def preview_version(self, dataset_id: str, version_id: str) -> DatasetPreviewData:
        dataset_uuid = _parse_dataset(dataset_id)
        version_uuid = _parse_version(version_id)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(dataset_uuid)
            if dataset is None:
                raise DatasetNotFoundError
            version = VersionRepository(session).get_for_dataset(
                dataset_uuid, version_uuid
            )
            if version is None:
                raise VersionNotFoundError
            snapshot = _dataset_snapshot(dataset)
            version_kind = version.kind
            storage_key = version.storage_key
            version_number = version.version_number
        from facilio_processing import preview_dataset, preview_frame

        path = self._storage.resolve(storage_key)
        if not path.is_file():
            raise AppError(
                "INGESTION_FAILED",
                "The stored file for this version is no longer available.",
                status_code=500,
            )
        if version_kind == "ORIGINAL":
            result = preview_dataset(
                path,
                snapshot["original_filename"],
                max_rows=self._settings.PREVIEW_MAX_ROWS,
                max_columns=self._settings.PREVIEW_MAX_COLUMNS,
                sheet=snapshot["selected_sheet"],
                file_type=snapshot["file_type"],
            )
        else:
            from facilio_processing.table_store import read_table

            frame, _columns = read_table(path)
            result = preview_frame(
                frame,
                max_rows=self._settings.PREVIEW_MAX_ROWS,
                max_columns=self._settings.PREVIEW_MAX_COLUMNS,
            )
        return DatasetPreviewData(
            dataset_id=dataset_uuid,
            version_id=version_uuid,
            version_number=version_number,
            columns=[
                DatasetColumn.model_validate(asdict(col)) for col in result.columns
            ],
            rows=result.rows,
            row_count=result.row_count,
            column_count=result.column_count,
            preview_row_count=result.preview_row_count,
            truncated_rows=result.truncated_rows,
            truncated_columns=result.truncated_columns,
        )

    def preview_transformation(
        self, dataset_id: str, version_id: str, request: TransformationRequest
    ) -> TransformationPreviewData:
        dataset_uuid = _parse_dataset(dataset_id)
        version_uuid = _parse_version(version_id)
        with self._database.session_scope() as session:
            dataset, version = self._require_ready(session, dataset_uuid, version_uuid)
            frame = load_version_frame(self._storage, dataset, version)
        from facilio_processing.errors import ProcessingError
        from facilio_processing.transformations import preview_transformation

        try:
            _result_frame, result = preview_transformation(
                frame, request.operation, request.parameters
            )
        except ProcessingError as error:
            _raise_processing(error)
        logger.info(
            "transformation previewed dataset_id=%s version_id=%s operation=%s",
            dataset_uuid,
            version_uuid,
            result.operation,
        )
        return _to_preview(version_uuid, result)

    def apply_transformation(
        self, dataset_id: str, version_id: str, request: TransformationRequest
    ) -> TransformationApplyData:
        dataset_uuid = _parse_dataset(dataset_id)
        version_uuid = _parse_version(version_id)
        with self._database.session_scope() as session:
            dataset, parent = self._require_ready(session, dataset_uuid, version_uuid)
            frame = load_version_frame(self._storage, dataset, parent)
        from facilio_processing.errors import ProcessingError
        from facilio_processing.inference import columns_from_frame
        from facilio_processing.transformations import apply_transformation
        from facilio_processing.transformations.errors import TransformationNoOpError

        try:
            result_frame, result = apply_transformation(
                frame, request.operation, request.parameters
            )
        except ProcessingError as error:
            _raise_processing(error)
        if result.impact.no_op:
            raise AppError(
                TransformationNoOpError.code,
                "No changes detected. A new version was not created.",
                status_code=409,
            )

        new_id = uuid.uuid4()
        key = write_derived_table(self._storage, dataset_uuid, new_id, result_frame)
        columns = [asdict(column) for column in columns_from_frame(result_frame)]
        try:
            with self._database.session_scope() as session:
                dataset_row = DatasetRepository(session).get(dataset_uuid)
                if dataset_row is None:
                    raise DatasetNotFoundError
                versions = VersionRepository(session)
                number = versions.next_version_number(dataset_uuid)
                child = DatasetVersion(
                    id=new_id,
                    dataset_id=dataset_uuid,
                    version_number=number,
                    parent_version_id=version_uuid,
                    kind="DERIVED",
                    storage_key=key,
                    storage_format="facilio.table.v1",
                    row_count=int(result_frame.shape[0]),
                    column_count=int(result_frame.shape[1]),
                    columns_json=columns,
                    label=result.summary[:256],
                    profile_status="NOT_PROFILED",
                )
                versions.add(child)
                record = Transformation(
                    dataset_id=dataset_uuid,
                    input_version_id=version_uuid,
                    output_version_id=child.id,
                    operation_code=result.operation,
                    parameters_json=dict(request.parameters),
                    summary=result.summary,
                    impact_json=asdict(result.impact),
                    extra_json=result.extra,
                )
                TransformationRepository(session).add(record)
                child.created_by_transformation_id = record.id
                dataset_row.current_version_id = child.id
                dataset_row.row_count = child.row_count
                dataset_row.column_count = child.column_count
                dataset_row.columns_json = columns
                DatasetRepository(session).save(dataset_row)
                version_payload = _to_version_detail(child, child.id)
                apply_payload = TransformationApplyData(
                    version=version_payload,
                    transformation_id=record.id,
                    summary=result.summary,
                    impact=_to_impact(result.impact),
                    profile_status="NOT_PROFILED",
                    quality_delta=None,
                )
        except IntegrityError:
            self._storage.delete_prefix(f"{dataset_uuid}/versions/{new_id}")
            raise AppError(
                "TRANSFORMATION_FAILED",
                "The transformation could not be persisted.",
                status_code=500,
            ) from None
        except Exception:
            self._storage.delete_prefix(f"{dataset_uuid}/versions/{new_id}")
            raise

        logger.info(
            "transformation applied dataset_id=%s output_version_id=%s operation=%s",
            dataset_uuid,
            new_id,
            result.operation,
        )
        from facilio.services.profiles import ProfileService

        profile_service = ProfileService(self._settings, self._database)
        profile_status = "NOT_PROFILED"
        quality_delta = None
        try:
            profile_service.run_profile(str(dataset_uuid), str(new_id))
            profile_status = "READY"
            quality_delta = self._quality_delta(
                str(dataset_uuid), str(version_uuid), str(new_id)
            )
        except AppError:
            logger.info(
                "derived profile failed dataset_id=%s version_id=%s",
                dataset_uuid,
                new_id,
            )
            profile_status = "FAILED"
        apply_payload.profile_status = profile_status  # type: ignore[misc]
        apply_payload.quality_delta = quality_delta
        apply_payload.version.profile_status = profile_status  # type: ignore[assignment]
        return apply_payload

    def lineage(self, dataset_id: str, version_id: str) -> LineageData:
        dataset_uuid = _parse_dataset(dataset_id)
        version_uuid = _parse_version(version_id)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(dataset_uuid)
            if dataset is None:
                raise DatasetNotFoundError
            versions = {
                item.id: item
                for item in VersionRepository(session).list_for_dataset(dataset_uuid)
            }
            current = versions.get(version_uuid)
            if current is None:
                raise VersionNotFoundError
            chain: list[DatasetVersion] = []
            seen: set[uuid.UUID] = set()
            cursor: DatasetVersion | None = current
            while cursor is not None and cursor.id not in seen:
                chain.append(cursor)
                seen.add(cursor.id)
                if cursor.parent_version_id is None:
                    break
                cursor = versions.get(cursor.parent_version_id)
            chain.reverse()
            items: list[LineageNodeData] = []
            for item in chain:
                transform = None
                if item.outgoing_transformation is not None:
                    transform = _to_record(item.outgoing_transformation)
                elif item.kind == "DERIVED":
                    stored = TransformationRepository(session).get_by_output(item.id)
                    if stored is not None:
                        transform = _to_record(stored)
                items.append(
                    LineageNodeData(
                        version=_to_version_summary(item, dataset.current_version_id),
                        transformation=transform,
                    )
                )
            return LineageData(items=items)

    def compare_with_parent(
        self, dataset_id: str, version_id: str
    ) -> VersionComparisonData:
        dataset_uuid = _parse_dataset(dataset_id)
        version_uuid = _parse_version(version_id)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(dataset_uuid)
            if dataset is None:
                raise DatasetNotFoundError
            child = VersionRepository(session).get_for_dataset(
                dataset_uuid, version_uuid
            )
            if child is None:
                raise VersionNotFoundError
            if child.parent_version_id is None:
                raise AppError(
                    "VERSION_NOT_FOUND",
                    "The original version has no parent to compare.",
                    status_code=409,
                )
            parent = VersionRepository(session).get_for_dataset(
                dataset_uuid, child.parent_version_id
            )
            if parent is None:
                raise VersionNotFoundError
            record = TransformationRepository(session).get_by_output(child.id)
            current_id = dataset.current_version_id
            parent_summary = _to_version_summary(parent, current_id)
            child_summary = _to_version_summary(child, current_id)
            impact = None
            transformation = None
            if record is not None:
                transformation = _to_record(record)
                impact = TransformationImpactData.model_validate(record.impact_json)
        delta = self._quality_delta(
            dataset_id, str(parent_summary.id), str(child_summary.id)
        )
        return VersionComparisonData(
            parent=parent_summary,
            child=child_summary,
            impact=impact,
            transformation=transformation,
            quality_delta=delta,
        )

    def set_current_version(
        self, dataset_id: str, payload: SetCurrentVersionRequest
    ) -> DatasetVersionDetail:
        dataset_uuid = _parse_dataset(dataset_id)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(dataset_uuid)
            if dataset is None:
                raise DatasetNotFoundError
            version = VersionRepository(session).get_for_dataset(
                dataset_uuid, payload.version_id
            )
            if version is None:
                raise VersionNotFoundError
            dataset.current_version_id = version.id
            dataset.row_count = version.row_count
            dataset.column_count = version.column_count
            dataset.columns_json = version.columns_json
            DatasetRepository(session).save(dataset)
            logger.info(
                "current version set dataset_id=%s version_id=%s",
                dataset_uuid,
                version.id,
            )
            return _to_version_detail(version, version.id)

    def workspace_stats(self) -> WorkspaceStatsData:
        from facilio.services.workflows import WorkflowService

        return WorkflowService(self._settings, self._database).workspace_stats()

    def _require_ready(self, session, dataset_uuid, version_uuid):
        dataset = DatasetRepository(session).get(dataset_uuid)
        if dataset is None:
            raise DatasetNotFoundError
        if dataset.status != "ready":
            raise AppError(
                "INGESTION_FAILED",
                "This dataset is not available for transformation.",
                status_code=409,
            )
        version = VersionRepository(session).get_for_dataset(dataset_uuid, version_uuid)
        if version is None:
            raise VersionNotFoundError
        return dataset, version

    def _quality_delta(
        self, dataset_id: str, before_version_id: str, after_version_id: str
    ) -> QualityDeltaData | None:
        from facilio.services.profiles import ProfileService

        service = ProfileService(self._settings, self._database)
        try:
            before = service.get_profile(dataset_id, before_version_id)
            after = service.get_profile(dataset_id, after_version_id)
        except AppError:
            return None
        if before.status != "READY" or after.status != "READY":
            return None
        before_score = before.quality.overall_score if before.quality else None
        after_score = after.quality.overall_score if after.quality else None
        delta = None
        if before_score is not None and after_score is not None:
            delta = round(after_score - before_score, 1)
        before_dims = {
            item.key: item.score
            for item in (before.quality.dimensions if before.quality else [])
        }
        dimensions: list[QualityDeltaDimension] = []
        if after.quality:
            for item in after.quality.dimensions:
                previous = before_dims.get(item.key)
                dim_delta = None
                if previous is not None and item.score is not None:
                    dim_delta = round(item.score - previous, 1)
                dimensions.append(
                    QualityDeltaDimension(
                        key=item.key,
                        label=item.label,
                        before=previous,
                        after=item.score,
                        delta=dim_delta,
                    )
                )
        return QualityDeltaData(
            before=before_score,
            after=after_score,
            delta=delta,
            dimensions=dimensions,
        )


def _parse_dataset(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise DatasetNotFoundError from None


def _parse_version(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise VersionNotFoundError from None


def _raise_processing(error) -> None:
    raise AppError(
        error.code,
        error.message,
        status_code=400 if error.code != "TRANSFORMATION_FAILED" else 500,
        details=error.details,
    ) from error


def _dataset_snapshot(dataset: Dataset) -> dict[str, Any]:
    return {
        "original_filename": dataset.original_filename,
        "selected_sheet": dataset.selected_sheet,
        "file_type": dataset.file_type,
    }


def _to_version_summary(
    version: DatasetVersion, current_id: uuid.UUID | None
) -> DatasetVersionSummary:
    operation = None
    summary = None
    workflow_name = None
    workflow_revision = None
    if version.outgoing_transformation is not None:
        operation = version.outgoing_transformation.operation_code
        summary = version.outgoing_transformation.summary
    run = version.created_by_workflow_run
    if run is not None:
        workflow_name = str(run.workflow_snapshot.get("name") or "Workflow")
        workflow_revision = run.workflow_revision
    return DatasetVersionSummary(
        id=version.id,
        dataset_id=version.dataset_id,
        version_number=version.version_number,
        parent_version_id=version.parent_version_id,
        kind=version.kind,  # type: ignore[arg-type]
        label=version.label,
        row_count=version.row_count,
        column_count=version.column_count,
        profile_status=version.profile_status,  # type: ignore[arg-type]
        profiled_at=version.profiled_at,
        created_at=version.created_at,
        is_current=version.id == current_id,
        operation_code=operation,
        operation_summary=summary,
        created_by_workflow_run_id=version.created_by_workflow_run_id,
        workflow_name=workflow_name,
        workflow_revision=workflow_revision,
    )


def _to_version_detail(
    version: DatasetVersion, current_id: uuid.UUID | None
) -> DatasetVersionDetail:
    return DatasetVersionDetail(
        **_to_version_summary(version, current_id).model_dump(),
        columns=list(version.columns_json or []),
    )


def _to_impact(impact) -> TransformationImpactData:
    return TransformationImpactData(
        rows_before=impact.rows_before,
        rows_after=impact.rows_after,
        columns_before=impact.columns_before,
        columns_after=impact.columns_after,
        changed_cell_count=impact.changed_cell_count,
        removed_row_count=impact.removed_row_count,
        removed_column_count=impact.removed_column_count,
        affected_row_count=impact.affected_row_count,
        no_op=impact.no_op,
    )


def _to_preview(version_id: uuid.UUID, result) -> TransformationPreviewData:
    return TransformationPreviewData(
        operation=result.operation,
        parameters=result.parameters,
        input_version_id=version_id,
        impact=_to_impact(result.impact),
        examples=[
            ChangeExampleData.model_validate(asdict(item)) for item in result.examples
        ],
        warnings=result.warnings,
        summary=result.summary,
        extra=result.extra,
    )


def _to_record(row: Transformation) -> TransformationRecordData:
    return TransformationRecordData(
        id=row.id,
        dataset_id=row.dataset_id,
        input_version_id=row.input_version_id,
        output_version_id=row.output_version_id,
        operation_code=row.operation_code,
        parameters=row.parameters_json,
        summary=row.summary,
        impact=TransformationImpactData.model_validate(row.impact_json),
        created_at=row.created_at,
    )
