"""Dataset API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

DatasetStatus = Literal["pending", "processing", "ready", "failed"]
DatasetFileType = Literal["csv", "xlsx", "json"]
ColumnDtype = Literal["text", "integer", "decimal", "boolean", "datetime", "unknown"]


class DatasetColumn(BaseModel):
    name: str
    index: int
    dtype: ColumnDtype


class DatasetSummary(BaseModel):
    id: UUID
    name: str
    original_filename: str
    file_type: DatasetFileType
    mime_type: str | None = None
    file_size: int
    status: DatasetStatus
    row_count: int | None = None
    column_count: int | None = None
    selected_sheet: str | None = None
    encoding: str | None = None
    delimiter: str | None = None
    created_at: datetime
    updated_at: datetime
    profile_status: Literal["NOT_PROFILED", "PROFILING", "READY", "FAILED"] = (
        "NOT_PROFILED"
    )
    quality_score: float | None = None
    quality_grade: str | None = None
    profiled_at: datetime | None = None
    current_version_id: UUID | None = None
    current_version_number: int | None = None
    version_count: int = 1
    is_sample: bool = False
    sample_key: str | None = None
    issue_count: int | None = None


class DatasetDetail(DatasetSummary):
    columns: list[DatasetColumn] = Field(default_factory=list)
    error_code: str | None = None
    error_message: str | None = None


class DatasetListData(BaseModel):
    items: list[DatasetSummary]
    page: int
    page_size: int
    total: int
    max_upload_size_mb: int
    supported_file_types: list[DatasetFileType]


class DatasetPreviewData(BaseModel):
    dataset_id: UUID
    version_id: UUID | None = None
    version_number: int | None = None
    columns: list[DatasetColumn]
    rows: list[list[Any]]
    row_count: int
    column_count: int
    preview_row_count: int
    truncated_rows: bool
    truncated_columns: bool


class RenameDatasetRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty.")
        return cleaned


class SheetInfoData(BaseModel):
    name: str
    empty: bool
    hidden: bool = False


class SheetSelectionData(BaseModel):
    staging_id: UUID
    original_filename: str
    file_type: Literal["xlsx"]
    file_size: int
    sheets: list[SheetInfoData]
