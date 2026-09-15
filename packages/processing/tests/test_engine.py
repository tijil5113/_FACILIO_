"""Detection, registry, inference, and serialization tests."""

from pathlib import Path

import pandas as pd
import pytest

from facilio_processing.detect import detect_file_type
from facilio_processing.engine import get_engine_info, preview_dataset, read_dataset
from facilio_processing.errors import EmptyFileError, UnsupportedFormatError
from facilio_processing.inference import infer_dtype
from facilio_processing.readers.registry import get_reader, supported_file_types
from facilio_processing.serialization import json_safe
from helpers import write_csv, write_json


def test_engine_status_is_profiling() -> None:
    info = get_engine_info()
    assert info.status == "workflows"
    assert info.name == "facilio-processing"


def test_supported_types() -> None:
    assert supported_file_types() == ("csv", "xlsx", "json")
    assert get_reader("csv").__class__.__name__ == "CsvReader"


def test_detect_csv(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "a.csv", "a\n1\n")
    assert detect_file_type(path, "a.csv") == "csv"


def test_detect_rejects_xls_magic(tmp_path: Path) -> None:
    path = tmp_path / "legacy.xls"
    path.write_bytes(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 16)
    with pytest.raises(UnsupportedFormatError):
        detect_file_type(path, "legacy.xls")


def test_detect_empty_file(tmp_path: Path) -> None:
    path = tmp_path / "empty.csv"
    path.write_bytes(b"")
    with pytest.raises(EmptyFileError):
        detect_file_type(path, "empty.csv")


def test_read_dataset_roundtrip(tmp_path: Path) -> None:
    path = write_json(tmp_path / "p.json", '[{"sku":"A","price":1.5}]')
    result = read_dataset(path, "p.json")
    assert result.column_count == 2
    preview = preview_dataset(path, "p.json", max_rows=10, max_columns=10)
    assert preview.rows[0][0] == "A"
    assert preview.rows[0][1] == 1.5


def test_json_safe_nan_nat_and_timestamp() -> None:
    assert json_safe(float("nan")) is None
    assert json_safe(pd.NaT) is None
    assert json_safe(pd.Timestamp("2024-01-02T03:04:05")) == "2024-01-02T03:04:05"
    assert json_safe(None) is None
    assert json_safe(False) is False
    assert json_safe(0) == 0


def test_infer_dtype_conservative() -> None:
    assert infer_dtype([1, 2, 3]) == "integer"
    assert infer_dtype([1.5, 2.0]) == "decimal"
    assert infer_dtype([True, False]) == "boolean"
    assert infer_dtype(["2024-01-01", "2024-02-02"]) == "text"
    assert infer_dtype([None, None]) == "unknown"
