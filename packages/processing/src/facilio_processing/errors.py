"""Typed processing failures with stable application error codes."""

from __future__ import annotations


class ProcessingError(Exception):
    """Base error for dataset readers. `code` maps to the API contract."""

    code = "INGESTION_FAILED"

    def __init__(self, message: str, *, details: object | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class UnsupportedFormatError(ProcessingError):
    code = "UNSUPPORTED_FILE_TYPE"


class EmptyFileError(ProcessingError):
    code = "EMPTY_FILE"


class EmptyDatasetError(ProcessingError):
    code = "EMPTY_DATASET"


class InvalidCsvError(ProcessingError):
    code = "INVALID_CSV"


class InvalidWorkbookError(ProcessingError):
    code = "INVALID_WORKBOOK"


class SheetSelectionRequiredError(ProcessingError):
    code = "SHEET_SELECTION_REQUIRED"


class InvalidSheetError(ProcessingError):
    code = "INVALID_SHEET"


class InvalidJsonError(ProcessingError):
    code = "INVALID_JSON"


class NonTabularJsonError(ProcessingError):
    code = "NON_TABULAR_JSON"
