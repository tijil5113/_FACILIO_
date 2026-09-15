"""CSV reader tests."""

from pathlib import Path

import pytest

from facilio_processing.errors import EmptyFileError, InvalidCsvError
from facilio_processing.readers.csv import CsvReader
from helpers import write_csv


def test_normal_csv(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "ok.csv", "name,city\nAda,Paris\nBob,Lyon\n")
    result = CsvReader().read(path)
    assert result.row_count == 2
    assert result.column_count == 2
    assert [column.name for column in result.columns] == ["name", "city"]
    assert result.frame.iloc[0, 0] == "Ada"
    assert result.delimiter == ","
    assert result.encoding in {"utf-8", "utf-8-sig"}


def test_quoted_comma(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "q.csv", 'name,note\nAda,"Paris, FR"\n')
    result = CsvReader().read(path)
    assert result.frame.iloc[0, 1] == "Paris, FR"


def test_utf8_bom(tmp_path: Path) -> None:
    path = tmp_path / "bom.csv"
    path.write_bytes(b"\xef\xbb\xbfname,city\nAda,Paris\n")
    result = CsvReader().read(path)
    assert result.columns[0].name == "name"
    assert result.encoding == "utf-8-sig"


def test_semicolon_delimiter(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "eu.csv", "name;city\nAda;Paris\n")
    result = CsvReader().read(path)
    assert result.delimiter == ";"
    assert result.frame.iloc[0, 1] == "Paris"


def test_empty_cells_are_null_not_empty_string(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "nulls.csv", "name,city\nAda,\n,Lyon\n")
    result = CsvReader().read(path)
    assert result.frame.iloc[0, 1] is None
    assert result.frame.iloc[1, 0] is None


def test_na_string_is_preserved(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "na.csv", "name,city\nAda,NA\n")
    result = CsvReader().read(path)
    assert result.frame.iloc[0, 1] == "NA"


def test_duplicate_column_names(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "dup.csv", "value,value\n1,2\n")
    result = CsvReader().read(path)
    assert [column.name for column in result.columns] == ["value", "value"]
    assert result.frame.iloc[0, 0] == "1"
    assert result.frame.iloc[0, 1] == "2"


def test_header_only_is_valid_empty_dataset(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "headers.csv", "name,city\n")
    result = CsvReader().read(path)
    assert result.row_count == 0
    assert result.column_count == 2


def test_empty_file(tmp_path: Path) -> None:
    path = tmp_path / "empty.csv"
    path.write_bytes(b"")
    with pytest.raises(EmptyFileError):
        CsvReader().read(path)


def test_malformed_inconsistent_row(tmp_path: Path) -> None:
    path = write_csv(tmp_path / "bad.csv", "a,b\n1,2,3\n")
    with pytest.raises(InvalidCsvError):
        CsvReader().read(path)


def test_binary_content_rejected(tmp_path: Path) -> None:
    path = tmp_path / "bin.csv"
    path.write_bytes(b"name,city\nAda\x00Paris\n")
    with pytest.raises(InvalidCsvError):
        CsvReader().read(path)
