"""Dataset ingestion and lifecycle service.

HTTP routes never parse files. This service validates, stores, reads through
the processing package, and persists metadata. Source bytes are not modified.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict
from pathlib import Path
from typing import BinaryIO, NoReturn

from werkzeug.datastructures import FileStorage

from facilio.core.config import Settings
from facilio.core.errors import AppError, DatasetNotFoundError
from facilio.core.filenames import display_stem, original_filename
from facilio.core.logging import get_logger
from facilio.db.session import Database
from facilio.models.dataset import Dataset
from facilio.models.staging import StagingUpload
from facilio.models.version import DatasetVersion
from facilio.repositories.dataset import DatasetRepository
from facilio.repositories.staging import StagingRepository
from facilio.schemas.datasets import (
    DatasetColumn,
    DatasetDetail,
    DatasetListData,
    DatasetPreviewData,
    DatasetSummary,
    SheetInfoData,
    SheetSelectionData,
)
from facilio.storage.local import LocalStorageService

logger = get_logger("facilio.datasets")

_MIME = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "json": "application/json",
}


class DatasetService:
    def __init__(self, settings: Settings, database: Database) -> None:
        self._settings = settings
        self._database = database
        self._storage = LocalStorageService(settings.upload_root_path())

    def list_datasets(self, *, page: int, page_size: int) -> DatasetListData:
        page, page_size = _pagination(page, page_size)
        with self._database.session_scope() as session:
            items, total = DatasetRepository(session).list_page(
                page=page, page_size=page_size
            )
            summaries = [_to_summary(item) for item in items]
        return DatasetListData(
            items=summaries,
            page=page,
            page_size=page_size,
            total=total,
            max_upload_size_mb=self._settings.MAX_UPLOAD_SIZE_MB,
            supported_file_types=["csv", "xlsx", "json"],
        )

    def get_dataset(self, dataset_id: str) -> DatasetDetail:
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(_parse_id(dataset_id))
            if dataset is None:
                raise DatasetNotFoundError
            return _to_detail(dataset)

    def preview(self, dataset_id: str) -> DatasetPreviewData:
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get(_parse_id(dataset_id))
            if dataset is None:
                raise DatasetNotFoundError
            if dataset.status != "ready":
                raise AppError(
                    "INGESTION_FAILED",
                    "This dataset is not available for preview.",
                    status_code=409,
                )
            storage_key = dataset.storage_key
            original = dataset.original_filename
            file_type = dataset.file_type
            sheet = dataset.selected_sheet
            identity = dataset.id
            current = dataset.current_version
            version_id = current.id if current is not None else None
            version_number = current.version_number if current is not None else None
            version_kind = current.kind if current is not None else "ORIGINAL"
            version_key = current.storage_key if current is not None else storage_key
        from facilio_processing import preview_dataset, preview_frame

        path = self._storage.resolve(version_key)
        if not path.is_file():
            raise AppError(
                "INGESTION_FAILED",
                "The source file for this dataset is no longer available.",
                status_code=500,
            )
        if version_kind == "DERIVED":
            from facilio_processing.table_store import read_table

            frame, _columns = read_table(path)
            result = preview_frame(
                frame,
                max_rows=self._settings.PREVIEW_MAX_ROWS,
                max_columns=self._settings.PREVIEW_MAX_COLUMNS,
            )
        else:
            result = preview_dataset(
                path,
                original,
                max_rows=self._settings.PREVIEW_MAX_ROWS,
                max_columns=self._settings.PREVIEW_MAX_COLUMNS,
                sheet=sheet,
                file_type=file_type,  # type: ignore[arg-type]
            )
        return DatasetPreviewData(
            dataset_id=identity,
            version_id=version_id,
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

    def rename(self, dataset_id: str, name: str) -> DatasetDetail:
        with self._database.session_scope() as session:
            repo = DatasetRepository(session)
            dataset = repo.get(_parse_id(dataset_id))
            if dataset is None:
                raise DatasetNotFoundError
            dataset.name = name
            repo.save(dataset)
            logger.info("dataset renamed dataset_id=%s", dataset.id)
            return _to_detail(dataset)

    def delete(self, dataset_id: str) -> None:
        with self._database.session_scope() as session:
            repo = DatasetRepository(session)
            dataset = repo.get(_parse_id(dataset_id))
            if dataset is None:
                raise DatasetNotFoundError
            key = dataset.storage_key
            identity = dataset.id
            dataset.current_version_id = None
            session.flush()
            repo.delete(dataset)
        self._storage.delete(key)
        self._storage.delete_prefix(str(identity))
        logger.info("dataset deleted dataset_id=%s", identity)

    def get_sample(self, sample_key: str) -> DatasetDetail | None:
        with self._database.session_scope() as session:
            dataset = DatasetRepository(session).get_by_sample_key(sample_key)
            if dataset is None:
                return None
            return _to_detail(dataset)

    def create_from_upload(
        self,
        upload: FileStorage | None,
        *,
        sheet: str | None = None,
        staging_id: str | None = None,
        is_sample: bool = False,
        sample_key: str | None = None,
        display_name: str | None = None,
    ) -> DatasetDetail:
        self._purge_expired_staging()
        if staging_id:
            return self._complete_staging(staging_id, sheet)
        if upload is None or not upload.filename:
            raise AppError(
                "EMPTY_FILE",
                "Choose a CSV, XLSX, or JSON file to upload.",
                status_code=400,
            )
        filename = original_filename(upload.filename)
        data = _read_upload(upload)
        logger.info(
            "dataset upload received filename=%s size=%s",
            filename,
            len(data),
        )
        self._assert_size(len(data))
        if len(data) == 0:
            raise AppError("EMPTY_FILE", "The uploaded file is empty.", status_code=400)

        extension = Path(filename).suffix.lstrip(".") or "bin"
        storage_key = self._storage.put(data, extension=extension)
        try:
            return self._ingest_stored_file(
                storage_key,
                filename,
                file_size=len(data),
                sheet=sheet,
                is_sample=is_sample,
                sample_key=sample_key,
                display_name=display_name,
            )
        except AppError as error:
            if error.code != "SHEET_SELECTION_REQUIRED":
                self._storage.delete(storage_key)
            raise
        except Exception:
            self._storage.delete(storage_key)
            raise

    def _ingest_stored_file(
        self,
        storage_key: str,
        filename: str,
        *,
        file_size: int,
        sheet: str | None,
        is_sample: bool = False,
        sample_key: str | None = None,
        display_name: str | None = None,
    ) -> DatasetDetail:
        from facilio_processing import inspect_workbook, read_dataset
        from facilio_processing.detect import detect_file_type
        from facilio_processing.errors import (
            ProcessingError,
            SheetSelectionRequiredError,
        )

        path = self._storage.resolve(storage_key)
        try:
            file_type = detect_file_type(path, filename)
            logger.info("format identified file_type=%s", file_type)
            selected = sheet
            if file_type == "xlsx":
                inspection = inspect_workbook(path)
                usable = inspection.usable
                if selected is None and len(usable) > 1:
                    staging = self._stage_workbook(
                        storage_key,
                        filename,
                        file_size=file_size,
                        sheets=[asdict(item) for item in inspection.sheets],
                    )
                    logger.info(
                        "sheet selection required staging_id=%s sheets=%s",
                        staging.id,
                        len(inspection.sheets),
                    )
                    raise AppError(
                        "SHEET_SELECTION_REQUIRED",
                        "This workbook has multiple sheets. Select one to ingest.",
                        status_code=409,
                        details=SheetSelectionData(
                            staging_id=staging.id,
                            original_filename=filename,
                            file_type="xlsx",
                            file_size=file_size,
                            sheets=[
                                SheetInfoData.model_validate(item)
                                for item in asdict_sheets(inspection.sheets)
                            ],
                        ).model_dump(mode="json"),
                    )
                if selected is None and len(usable) == 1:
                    selected = usable[0].name
            logger.info("ingestion started filename=%s", filename)
            result = read_dataset(path, filename, sheet=selected, file_type=file_type)
        except AppError:
            raise
        except SheetSelectionRequiredError as error:
            details = error.details if isinstance(error.details, dict) else {}
            sheets = details.get("sheets", [])
            staging = self._stage_workbook(
                storage_key, filename, file_size=file_size, sheets=sheets
            )
            raise AppError(
                "SHEET_SELECTION_REQUIRED",
                error.message,
                status_code=409,
                details=SheetSelectionData(
                    staging_id=staging.id,
                    original_filename=filename,
                    file_type="xlsx",
                    file_size=file_size,
                    sheets=[SheetInfoData.model_validate(item) for item in sheets],
                ).model_dump(mode="json"),
            ) from error
        except ProcessingError as error:
            logger.info("ingestion failed code=%s", error.code)
            _raise_processing(error)

        return self._persist_ready(
            storage_key=storage_key,
            filename=filename,
            file_type=file_type,
            file_size=file_size,
            result=result,
            is_sample=is_sample,
            sample_key=sample_key,
            display_name=display_name,
        )

    def _complete_staging(self, staging_id: str, sheet: str | None) -> DatasetDetail:
        if not sheet or not sheet.strip():
            raise AppError(
                "INVALID_SHEET",
                "Select a worksheet to ingest.",
                status_code=400,
            )
        with self._database.session_scope() as session:
            repo = StagingRepository(session)
            staging = repo.get(_parse_id(staging_id, code="INVALID_SHEET"))
            if staging is None:
                raise AppError(
                    "DATASET_NOT_FOUND",
                    "The staged workbook is no longer available. "
                    "Upload the file again.",
                    status_code=404,
                )
            storage_key = staging.storage_key
            filename = staging.original_filename
            file_size = staging.file_size
            repo.delete(staging)
        try:
            created = self._ingest_stored_file(
                storage_key, filename, file_size=file_size, sheet=sheet.strip()
            )
        except AppError:
            self._storage.delete(storage_key)
            raise
        if isinstance(created, SheetSelectionData):
            self._storage.delete(storage_key)
            raise AppError(
                "INVALID_SHEET",
                "Select a worksheet to ingest.",
                status_code=400,
            )
        return created

    def _stage_workbook(
        self,
        storage_key: str,
        filename: str,
        *,
        file_size: int,
        sheets: list[dict[str, object]],
    ) -> StagingUpload:
        with self._database.session_scope() as session:
            staging = StagingUpload(
                original_filename=filename,
                file_type="xlsx",
                mime_type=_MIME["xlsx"],
                file_size=file_size,
                storage_key=storage_key,
                sheets_json=sheets,
            )
            return StagingRepository(session).add(staging)

    def _persist_ready(
        self,
        *,
        storage_key: str,
        filename: str,
        file_type: str,
        file_size: int,
        result,
        is_sample: bool = False,
        sample_key: str | None = None,
        display_name: str | None = None,
    ) -> DatasetDetail:
        try:
            with self._database.session_scope() as session:
                repo = DatasetRepository(session)
                name = _unique_name(
                    repo.names(), display_name or display_stem(filename)
                )
                dataset = Dataset(
                    name=name,
                    original_filename=filename,
                    file_type=file_type,
                    mime_type=_MIME.get(file_type),
                    file_size=file_size,
                    status="ready",
                    row_count=result.row_count,
                    column_count=result.column_count,
                    storage_key=storage_key,
                    selected_sheet=result.selected_sheet,
                    encoding=result.encoding,
                    delimiter=result.delimiter,
                    columns_json=[asdict(column) for column in result.columns],
                    is_sample=is_sample,
                    sample_key=sample_key,
                )
                repo.add(dataset)
                original = DatasetVersion(
                    dataset_id=dataset.id,
                    version_number=1,
                    parent_version_id=None,
                    kind="ORIGINAL",
                    storage_key=storage_key,
                    storage_format=file_type,
                    row_count=result.row_count,
                    column_count=result.column_count,
                    columns_json=[asdict(column) for column in result.columns],
                    label="Original",
                    profile_status="NOT_PROFILED",
                )
                session.add(original)
                session.flush()
                dataset.current_version_id = original.id
                logger.info(
                    "ingestion completed dataset_id=%s rows=%s columns=%s",
                    dataset.id,
                    dataset.row_count,
                    dataset.column_count,
                )
                return _to_detail(dataset)
        except Exception:
            self._storage.delete(storage_key)
            raise

    def _purge_expired_staging(self) -> None:
        with self._database.session_scope() as session:
            repo = StagingRepository(session)
            expired = repo.expired()
            for staging in expired:
                self._storage.delete(staging.storage_key)
                repo.delete(staging)

    def _assert_size(self, size: int) -> None:
        if size > self._settings.max_upload_bytes:
            raise AppError(
                "FILE_TOO_LARGE",
                (
                    "The upload exceeds the allowed limit of "
                    f"{self._settings.MAX_UPLOAD_SIZE_MB} MB."
                ),
                status_code=413,
            )


def _read_upload(upload: FileStorage | BinaryIO) -> bytes:
    if hasattr(upload, "stream"):
        upload.stream.seek(0)
        return upload.stream.read()
    return upload.read()


def _parse_id(value: str, *, code: str = "DATASET_NOT_FOUND") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        if code == "DATASET_NOT_FOUND":
            raise DatasetNotFoundError from None
        raise AppError(code, "The identifier is not valid.", status_code=400) from None


def _pagination(page: int, page_size: int) -> tuple[int, int]:
    safe_page = max(page, 1)
    safe_size = min(max(page_size, 1), 100)
    return safe_page, safe_size


def _unique_name(existing: set[str], base: str) -> str:
    if base not in existing:
        return base
    index = 2
    while f"{base} ({index})" in existing:
        index += 1
    return f"{base} ({index})"


def _raise_processing(error) -> NoReturn:
    status = 400
    if error.code == "UNSUPPORTED_FILE_TYPE":
        status = 415
    raise AppError(error.code, error.message, status_code=status, details=error.details)


def _to_summary(dataset: Dataset) -> DatasetSummary:
    current = dataset.current_version
    return DatasetSummary(
        id=dataset.id,
        name=dataset.name,
        original_filename=dataset.original_filename,
        file_type=dataset.file_type,  # type: ignore[arg-type]
        mime_type=dataset.mime_type,
        file_size=dataset.file_size,
        status=dataset.status,  # type: ignore[arg-type]
        row_count=current.row_count if current is not None else dataset.row_count,
        column_count=current.column_count
        if current is not None
        else dataset.column_count,
        selected_sheet=dataset.selected_sheet,
        encoding=dataset.encoding,
        delimiter=dataset.delimiter,
        created_at=dataset.created_at,
        updated_at=dataset.updated_at,
        profile_status=_profile_status(dataset),
        quality_score=_profile_score(dataset),
        quality_grade=_profile_grade(dataset),
        profiled_at=_profiled_at(dataset),
        current_version_id=dataset.current_version_id,
        current_version_number=current.version_number if current is not None else None,
        version_count=len(dataset.versions) if dataset.versions else 1,
        is_sample=bool(dataset.is_sample),
        sample_key=dataset.sample_key,
        issue_count=_issue_count(dataset),
    )


def _to_detail(dataset: Dataset) -> DatasetDetail:
    columns = [
        DatasetColumn.model_validate(item) for item in (dataset.columns_json or [])
    ]
    return DatasetDetail(
        **_to_summary(dataset).model_dump(),
        columns=columns,
        error_code=dataset.error_code,
        error_message=dataset.error_message,
    )


def asdict_sheets(sheets) -> list[dict[str, object]]:
    return [asdict(item) for item in sheets]


def _current_profile(dataset: Dataset):
    if dataset.current_version is None:
        return None
    return dataset.current_version.profile


def _profile_status(dataset: Dataset) -> str:
    profile = _current_profile(dataset)
    if profile is None:
        if dataset.current_version is not None:
            return dataset.current_version.profile_status
        return "NOT_PROFILED"
    return profile.status


def _profile_score(dataset: Dataset) -> float | None:
    profile = _current_profile(dataset)
    if profile is None or profile.status != "READY":
        return None
    return profile.overall_score


def _profile_grade(dataset: Dataset) -> str | None:
    profile = _current_profile(dataset)
    if profile is None or profile.status != "READY":
        return None
    return profile.grade


def _profiled_at(dataset: Dataset):
    profile = _current_profile(dataset)
    if profile is None:
        return None
    return profile.profiled_at


def _issue_count(dataset: Dataset) -> int | None:
    profile = _current_profile(dataset)
    if profile is None or profile.status != "READY":
        return None
    return profile.issue_count
