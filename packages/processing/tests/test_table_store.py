"""Derived table artifact round-trip tests."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

import pandas as pd

from facilio_processing.table_store import read_table, write_table


def test_round_trip_types_and_nulls(tmp_path: Path) -> None:
    frame = pd.DataFrame(
        {
            "name": ["Ada", None, ""],
            "count": [1, None, 3],
            "amount": [1.5, None, 0.0],
            "ok": [True, False, None],
            "when": [datetime(2024, 1, 2, 3, 4, 5), None, datetime(2024, 5, 6)],
        }
    )
    path = tmp_path / "data.ftable.json"
    write_table(path, frame)
    restored, columns = read_table(path)
    assert [column.name for column in columns] == list(frame.columns)
    assert restored.loc[0, "name"] == "Ada"
    assert restored.loc[1, "name"] is None
    assert restored.loc[2, "name"] == ""
    assert restored.loc[0, "count"] == 1
    assert restored.loc[1, "count"] is None
    assert restored.loc[0, "ok"] is True
    assert restored.loc[2, "ok"] is None
    assert restored.loc[0, "when"] == datetime(2024, 1, 2, 3, 4, 5)


def test_column_order_preserved(tmp_path: Path) -> None:
    frame = pd.DataFrame({"b": [1], "a": [2]})
    path = tmp_path / "order.ftable.json"
    write_table(path, frame)
    restored, _columns = read_table(path)
    assert list(restored.columns) == ["b", "a"]
