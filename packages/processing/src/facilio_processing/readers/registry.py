"""Reader registry.

New formats register here without changing Flask routes.
"""

from __future__ import annotations

from facilio_processing.errors import UnsupportedFormatError
from facilio_processing.readers.base import DatasetReader
from facilio_processing.readers.csv import CsvReader
from facilio_processing.readers.excel import ExcelReader
from facilio_processing.readers.json import JsonReader
from facilio_processing.types import FileType

_READERS: dict[FileType, type] = {
    "csv": CsvReader,
    "xlsx": ExcelReader,
    "json": JsonReader,
}


def get_reader(file_type: FileType) -> DatasetReader:
    reader_cls = _READERS.get(file_type)
    if reader_cls is None:
        raise UnsupportedFormatError(
            "Supported formats are CSV (.csv), Excel (.xlsx), and JSON (.json)."
        )
    return reader_cls()


def supported_file_types() -> tuple[FileType, ...]:
    return ("csv", "xlsx", "json")
