"""Profiling orchestration. Read-only against source storage."""

from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import UTC, datetime

from facilio.core.config import Settings
from facilio.core.errors import (
    AppError,
    DatasetNotFoundError,
    ProfileNotFoundError,
    ProfileNotReadyError,
    VersionNotFoundError,
)
from facilio.core.logging import get_logger
from facilio.db.session import Database
from facilio.models.profile import ColumnProfile as ColumnProfileRow
from facilio.models.profile import DatasetProfile as DatasetProfileRow
from facilio.models.profile import QualityIssue as QualityIssueRow
from facilio.models.version import DatasetVersion
from facilio.repositories.dataset import DatasetRepository
from facilio.repositories.profile import ProfileRepository, issue_sort_key
from facilio.repositories.version import VersionRepository
from facilio.schemas.profiles import (
    DatasetProfileData,
    IssueCountsData,
    QualityDimensionData,
    QualityIssueData,
    QualityIssueListData,
    QualityOverviewData,
    QualityOverviewItem,
    QualitySummaryData,
)
from facilio.storage.local import LocalStorageService

logger = get_logger("facilio.profiles")


class ProfileService:
    def __init__(self, settings: Settings, database: Database) -> None:
        self._settings = settings
        self._database = database
        self._storage = LocalStorageService(settings.upload_root_path())

    def run_profile(
        self, dataset_id: str, version_id: str | None = None
    ) -> DatasetProfileData:
        identity = _parse_id(dataset_id)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(identity)
            if dataset is None:
                raise DatasetNotFoundError
            if dataset.status != "ready":
                raise AppError(
                    "INGESTION_FAILED",
                    "This dataset is not available for profiling.",
                    status_code=409,
                )
            version = _resolve_version(session, dataset, version_id)
            version_uuid = version.id
            repo = ProfileRepository(session)
            existing = repo.get_for_version(version_uuid)
            if existing is not None:
                repo.delete(existing)
            stub = DatasetProfileRow(
                dataset_id=identity,
                version_id=version_uuid,
                status="PROFILING",
                profile_version="1.0",
                stale=False,
                issue_count=0,
            )
            repo.add(stub)
            version.profile_status = "PROFILING"
            stub_id = stub.id
            dataset_snapshot = dataset

        from facilio_processing import profile_table
        from facilio_processing.profiling.limits import ProfileLimits

        from facilio.services.frames import load_version_frame

        try:
            frame = load_version_frame(self._storage, dataset_snapshot, version)
        except AppError:
            self._mark_failed(version_uuid, stub_id)
            raise
        limits = ProfileLimits(
            top_values=self._settings.PROFILE_TOP_VALUES_LIMIT,
            evidence=self._settings.PROFILE_EVIDENCE_LIMIT,
            histogram_bins=self._settings.PROFILE_HISTOGRAM_BINS,
            duplicate_groups=self._settings.PROFILE_DUPLICATE_GROUPS_LIMIT,
        )
        try:
            logger.info(
                "profiling started dataset_id=%s version_id=%s", identity, version_uuid
            )
            profile, quality = profile_table(frame, limits=limits)
        except Exception:
            logger.exception(
                "profiling failed dataset_id=%s version_id=%s", identity, version_uuid
            )
            self._mark_failed(version_uuid, stub_id)
            raise AppError(
                "PROFILING_FAILED",
                "Dataset profiling could not be completed.",
                status_code=500,
            ) from None

        with self._database.session_scope() as session:
            repo = ProfileRepository(session)
            row = repo.get_for_version(version_uuid)
            stored_version = VersionRepository(session).get(version_uuid)
            if row is None or stored_version is None:
                raise AppError(
                    "PROFILING_FAILED",
                    "Dataset profiling could not be completed.",
                    status_code=500,
                )
            _populate_profile_row(row, profile, quality)
            stored_version.profile_status = "READY"
            stored_version.profiled_at = datetime.now(UTC)
            session.flush()
            logger.info(
                "profiling completed dataset_id=%s version_id=%s issues=%s",
                identity,
                version_uuid,
                row.issue_count,
            )
            return _to_profile_data(identity, row)

    def get_profile(
        self, dataset_id: str, version_id: str | None = None
    ) -> DatasetProfileData:
        identity = _parse_id(dataset_id)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(identity)
            if dataset is None:
                raise DatasetNotFoundError
            version = _resolve_version(session, dataset, version_id)
            row = ProfileRepository(session).get_for_version(version.id)
            if row is None:
                raise ProfileNotFoundError
            return _to_profile_data(identity, row)

    def get_quality(
        self, dataset_id: str, version_id: str | None = None
    ) -> QualitySummaryData:
        payload = self.get_profile(dataset_id, version_id)
        if payload.status == "FAILED":
            raise ProfileNotReadyError("Profiling failed. Retry analysis to continue.")
        if payload.status != "READY" or payload.quality is None:
            raise ProfileNotReadyError
        return payload.quality

    def list_issues(
        self,
        dataset_id: str,
        *,
        page: int,
        page_size: int,
        severity: str | None = None,
        category: str | None = None,
        column: str | None = None,
        version_id: str | None = None,
    ) -> QualityIssueListData:
        identity = _parse_id(dataset_id)
        page, page_size = _pagination(page, page_size)
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(identity)
            if dataset is None:
                raise DatasetNotFoundError
            version = _resolve_version(session, dataset, version_id)
            row = ProfileRepository(session).get_for_version(version.id)
            if row is None:
                raise ProfileNotFoundError
            if row.status != "READY":
                raise ProfileNotReadyError
            issues = list(row.issues)
        if severity:
            issues = [item for item in issues if item.severity == severity.upper()]
        if category:
            issues = [item for item in issues if item.category == category.upper()]
        if column:
            issues = [item for item in issues if item.column_name == column]
        issues.sort(key=issue_sort_key)
        total = len(issues)
        start = (page - 1) * page_size
        window = issues[start : start + page_size]
        return QualityIssueListData(
            items=[_to_issue(item) for item in window],
            page=page,
            page_size=page_size,
            total=total,
        )

    def overview(self) -> QualityOverviewData:
        with self._database.session_scope() as session:
            total = DatasetRepository(session).count()
            counts = ProfileRepository(session).count_current_by_status()
            ready = ProfileRepository(session).list_ready_current()
            assessed = [
                item
                for item in ready
                if item.overall_status == "ASSESSED" and item.overall_score is not None
            ]
            average = None
            if assessed:
                average = round(
                    sum(item.overall_score or 0.0 for item in assessed) / len(assessed),
                    1,
                )
            attention = sum(
                1
                for item in assessed
                if item.overall_score is not None and item.overall_score < 70
            )
            recent_rows = ready[:8]
            recent: list[QualityOverviewItem] = []
            dataset_repo = DatasetRepository(session)
            for row in recent_rows:
                dataset = dataset_repo.get(row.dataset_id)
                recent.append(
                    QualityOverviewItem(
                        id=row.dataset_id,
                        name=dataset.name if dataset else str(row.dataset_id),
                        overall_score=row.overall_score,
                        overall_status=row.overall_status,  # type: ignore[arg-type]
                        grade=row.grade,
                        profiled_at=row.profiled_at,
                        issue_count=row.issue_count,
                        profile_status=row.status,  # type: ignore[arg-type]
                    )
                )
        profiled = counts.get("READY", 0)
        failed = counts.get("FAILED", 0)
        not_profiled = max(0, total - profiled - failed - counts.get("PROFILING", 0))
        return QualityOverviewData(
            datasets_total=total,
            datasets_profiled=profiled,
            datasets_failed=failed,
            datasets_not_profiled=not_profiled,
            average_quality=average,
            datasets_needing_attention=attention,
            recently_profiled=recent,
        )

    def _mark_failed(self, version_id: uuid.UUID, _stub_id: uuid.UUID) -> None:
        with self._database.session_scope() as session:
            row = ProfileRepository(session).get_for_version(version_id)
            version = VersionRepository(session).get(version_id)
            if row is not None:
                row.status = "FAILED"
                row.error_code = "PROFILING_FAILED"
                row.error_message = "Dataset profiling could not be completed."
                row.updated_at = datetime.now(UTC)
            if version is not None:
                version.profile_status = "FAILED"


def _resolve_version(session, dataset, version_id: str | None) -> DatasetVersion:
    if version_id:
        try:
            parsed = uuid.UUID(str(version_id))
        except ValueError:
            raise VersionNotFoundError from None
        version = VersionRepository(session).get_for_dataset(dataset.id, parsed)
        if version is None:
            raise VersionNotFoundError
        return version
    if dataset.current_version is not None:
        return dataset.current_version
    versions = VersionRepository(session).list_for_dataset(dataset.id)
    if not versions:
        raise VersionNotFoundError
    return versions[0]


def _populate_profile_row(row: DatasetProfileRow, profile, quality) -> None:
    now = datetime.now(UTC)
    row.status = "READY"
    row.profile_version = profile.profile_version
    row.stale = False
    row.profiled_at = now
    row.error_code = None
    row.error_message = None
    row.summary_json = asdict(profile.summary)
    quality_payload = {
        "overall_score": quality.overall_score,
        "overall_status": quality.overall_status,
        "grade": quality.grade,
        "assessed_count": quality.assessed_count,
        "not_assessed_count": quality.not_assessed_count,
        "weighting": quality.weighting,
        "dimensions": [asdict(item) for item in quality.dimensions],
    }
    row.quality_json = quality_payload
    row.overall_score = quality.overall_score
    row.overall_status = quality.overall_status
    row.grade = quality.grade
    row.issue_count = len(quality.issues)
    row.updated_at = now
    row.columns.clear()
    row.issues.clear()
    issue_counts: dict[str, int] = {}
    for issue in quality.issues:
        if issue.column:
            issue_counts[issue.column] = issue_counts.get(issue.column, 0) + 1
        row.issues.append(
            QualityIssueRow(
                issue_key=issue.id,
                code=issue.code,
                category=issue.category,
                severity=issue.severity,
                title=issue.title,
                description=issue.description,
                column_name=issue.column,
                affected_count=issue.affected_count,
                affected_percentage=issue.affected_percentage,
                evidence_json=list(issue.evidence),
                suggested_action=issue.suggested_action,
            )
        )
    for column in profile.columns:
        payload = asdict(column)
        row.columns.append(
            ColumnProfileRow(
                position=column.position,
                name=column.name,
                detected_type=column.detected_type,
                ingestion_dtype=column.ingestion_dtype,
                semantic_hint=column.semantic_hint,
                cardinality=column.cardinality,
                issue_count=issue_counts.get(column.name, 0),
                stats_json=payload,
            )
        )


def _to_profile_data(
    dataset_id: uuid.UUID, row: DatasetProfileRow
) -> DatasetProfileData:
    quality = None
    if row.quality_json and row.status == "READY":
        payload = row.quality_json
        quality = QualitySummaryData(
            dataset_id=dataset_id,
            version_id=row.version_id,
            status=row.status,  # type: ignore[arg-type]
            profile_version=row.profile_version,
            profiled_at=row.profiled_at,
            stale=row.stale,
            overall_score=payload.get("overall_score"),
            overall_status=payload.get("overall_status"),
            grade=payload.get("grade"),
            assessed_count=payload.get("assessed_count") or 0,
            not_assessed_count=payload.get("not_assessed_count") or 0,
            weighting=payload.get("weighting"),
            dimensions=[
                QualityDimensionData.model_validate(item)
                for item in payload.get("dimensions") or []
            ],
        )
    ordered = sorted(row.columns, key=lambda col: col.position)
    columns = [item.stats_json for item in ordered]
    for column, stored in zip(columns, ordered, strict=False):
        column["issue_count"] = stored.issue_count
    severities = [item.severity for item in row.issues]
    return DatasetProfileData(
        dataset_id=dataset_id,
        version_id=row.version_id,
        status=row.status,  # type: ignore[arg-type]
        profile_version=row.profile_version,
        profiled_at=row.profiled_at,
        stale=row.stale,
        error_code=row.error_code,
        error_message=row.error_message,
        summary=row.summary_json,
        columns=columns,
        quality=quality,
        issue_counts=IssueCountsData(
            total=len(severities),
            critical=severities.count("CRITICAL"),
            warning=severities.count("WARNING"),
            info=severities.count("INFO"),
        ),
    )


def _to_issue(item: QualityIssueRow) -> QualityIssueData:
    from facilio_processing.transformations.suggestions import (
        suggested_operations_for_issue,
    )

    return QualityIssueData(
        id=item.issue_key,
        code=item.code,
        category=item.category,
        severity=item.severity,  # type: ignore[arg-type]
        title=item.title,
        description=item.description,
        column=item.column_name,
        affected_count=item.affected_count,
        affected_percentage=item.affected_percentage,
        evidence=item.evidence_json or [],
        suggested_action=item.suggested_action,
        suggested_operations=suggested_operations_for_issue(
            item.code, item.column_name
        ),
    )


def _parse_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise DatasetNotFoundError from None


def _pagination(page: int, page_size: int) -> tuple[int, int]:
    return max(page, 1), min(max(page_size, 1), 100)
