"""Format detection using extension, magic bytes, and structure.

Detection never trusts a filename extension alone.
"""

from __future__ import annotations

from pathlib import Path
from zipfile import BadZipFile, ZipFile

from facilio_processing.errors import (
    EmptyFileError,
    InvalidWorkbookError,
    UnsupportedFormatError,
)
from facilio_processing.types import FileType

XLS_OLE_MAGIC = b"\xd0\xcf\x11\xe0"
ZIP_MAGIC = b"PK"
SUPPORTED_EXTENSIONS = {".csv": "csv", ".xlsx": "xlsx", ".json": "json"}
UNSUPPORTED_KNOWN = {
    ".xls": "Excel .xls workbooks are not supported. Save the file as .xlsx.",
    ".parquet": "Parquet files are not supported.",
    ".xml": "XML files are not supported.",
    ".pdf": "PDF files are not supported.",
    ".zip": "Zip archives are not supported.",
}


def detect_file_type(path: Path, original_filename: str) -> FileType:
    if not path.exists() or path.stat().st_size == 0:
        raise EmptyFileError("The uploaded file is empty.")

    suffix = Path(original_filename).suffix.lower()
    header = _read_header(path)

    if suffix in UNSUPPORTED_KNOWN:
        raise UnsupportedFormatError(UNSUPPORTED_KNOWN[suffix])

    if header.startswith(XLS_OLE_MAGIC):
        raise UnsupportedFormatError(
            "Excel .xls workbooks are not supported. Save the file as .xlsx."
        )

    if header.startswith(ZIP_MAGIC):
        if not _is_xlsx_zip(path):
            if suffix == ".xlsx":
                raise InvalidWorkbookError("The file is not a valid Excel workbook.")
            raise UnsupportedFormatError(
                "This archive is not a supported dataset format."
            )
        if suffix in {".csv", ".json"}:
            raise UnsupportedFormatError(
                "The file contents do not match the declared extension."
            )
        return "xlsx"

    if suffix == ".xlsx":
        raise InvalidWorkbookError("The file is not a valid Excel workbook.")

    declared = SUPPORTED_EXTENSIONS.get(suffix)
    if declared is None:
        raise UnsupportedFormatError(
            "Supported formats are CSV (.csv), Excel (.xlsx), and JSON (.json)."
        )
    return declared  # type: ignore[return-value]


def _read_header(path: Path, size: int = 8) -> bytes:
    with path.open("rb") as handle:
        return handle.read(size)


def _is_xlsx_zip(path: Path) -> bool:
    try:
        with ZipFile(path) as archive:
            names = set(archive.namelist())
    except BadZipFile as error:
        raise InvalidWorkbookError("The file is not a valid Excel workbook.") from error
    return "[Content_Types].xml" in names and any(
        name.startswith("xl/") for name in names
    )
