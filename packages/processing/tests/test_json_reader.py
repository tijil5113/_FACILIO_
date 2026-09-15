"""JSON reader tests."""

from pathlib import Path

import pytest

from facilio_processing.errors import (
    EmptyDatasetError,
    InvalidJsonError,
    NonTabularJsonError,
)
from facilio_processing.readers.json import JsonReader
from helpers import write_json


def test_array_of_objects(tmp_path: Path) -> None:
    path = write_json(
        tmp_path / "ok.json",
        '[{"name":"A","value":1},{"name":"B","value":2}]',
    )
    result = JsonReader().read(path)
    assert result.row_count == 2
    assert [column.name for column in result.columns] == ["name", "value"]
    assert result.frame.iloc[0, 1] == 1
    assert result.columns[1].dtype == "integer"


def test_missing_keys_become_null(tmp_path: Path) -> None:
    path = write_json(
        tmp_path / "sparse.json",
        '[{"name":"A","value":1},{"name":"B"}]',
    )
    result = JsonReader().read(path)
    assert result.frame.iloc[1, 1] is None


def test_nested_object_is_json_text(tmp_path: Path) -> None:
    path = write_json(
        tmp_path / "nested.json",
        '[{"name":"A","meta":{"k":1}}]',
    )
    result = JsonReader().read(path)
    assert result.frame.iloc[0, 1] == '{"k": 1}'


def test_columnar_object(tmp_path: Path) -> None:
    path = write_json(
        tmp_path / "cols.json",
        '{"name":["A","B"],"value":[1,2]}',
    )
    result = JsonReader().read(path)
    assert result.row_count == 2
    assert result.frame.iloc[1, 0] == "B"


def test_malformed_json(tmp_path: Path) -> None:
    path = write_json(tmp_path / "bad.json", "{not json")
    with pytest.raises(InvalidJsonError):
        JsonReader().read(path)


def test_non_tabular_primitive_array(tmp_path: Path) -> None:
    path = write_json(tmp_path / "list.json", '["a","b"]')
    with pytest.raises(NonTabularJsonError):
        JsonReader().read(path)


def test_empty_array(tmp_path: Path) -> None:
    path = write_json(tmp_path / "empty.json", "[]")
    with pytest.raises(EmptyDatasetError):
        JsonReader().read(path)


def test_scalar_json(tmp_path: Path) -> None:
    path = write_json(tmp_path / "n.json", "12")
    with pytest.raises(NonTabularJsonError):
        JsonReader().read(path)


def test_boolean_and_null_preserved(tmp_path: Path) -> None:
    path = write_json(
        tmp_path / "types.json",
        '[{"ok":true,"note":null},{"ok":false,"note":""}]',
    )
    result = JsonReader().read(path)
    assert result.frame.iloc[0, 0] is True
    assert result.frame.iloc[0, 1] is None
    assert result.frame.iloc[1, 1] == ""
    assert result.columns[0].dtype == "boolean"
