"""Excel reader tests."""

from pathlib import Path
from zipfile import ZipFile

import pytest

from facilio_processing.errors import (
    EmptyDatasetError,
    InvalidSheetError,
    InvalidWorkbookError,
    SheetSelectionRequiredError,
)
from facilio_processing.readers.excel import ExcelReader
from helpers import write_xlsx


def test_single_sheet(tmp_path: Path) -> None:
    path = write_xlsx(
        tmp_path / "one.xlsx",
        {"Customers": [["name", "city"], ["Ada", "Paris"]]},
    )
    result = ExcelReader().read(path)
    assert result.selected_sheet == "Customers"
    assert result.row_count == 1
    assert result.frame.iloc[0, 0] == "Ada"


def test_multiple_sheets_require_selection(tmp_path: Path) -> None:
    path = write_xlsx(
        tmp_path / "multi.xlsx",
        {
            "Customers": [["name"], ["Ada"]],
            "Orders": [["id"], [1]],
        },
    )
    with pytest.raises(SheetSelectionRequiredError) as error:
        ExcelReader().read(path)
    assert error.value.details is not None
    assert "sheets" in error.value.details  # type: ignore[operator]


def test_selected_sheet(tmp_path: Path) -> None:
    path = write_xlsx(
        tmp_path / "multi.xlsx",
        {
            "Customers": [["name"], ["Ada"]],
            "Orders": [["id"], [7]],
        },
    )
    result = ExcelReader().read(path, sheet="Orders")
    assert result.selected_sheet == "Orders"
    assert result.frame.iloc[0, 0] == 7


def test_invalid_sheet(tmp_path: Path) -> None:
    path = write_xlsx(
        tmp_path / "one.xlsx",
        {"Customers": [["name"], ["Ada"]]},
    )
    with pytest.raises(InvalidSheetError):
        ExcelReader().read(path, sheet="Missing")


def test_empty_sheet_selection(tmp_path: Path) -> None:
    path = write_xlsx(
        tmp_path / "empty-sheet.xlsx",
        {
            "Customers": [["name"], ["Ada"]],
            "Archive": [],
        },
    )
    with pytest.raises(InvalidSheetError):
        ExcelReader().read(path, sheet="Archive")


def test_single_usable_sheet_ignores_empty_other(tmp_path: Path) -> None:
    path = write_xlsx(
        tmp_path / "one-usable.xlsx",
        {
            "Customers": [["name"], ["Ada"]],
            "Archive": [],
        },
    )
    result = ExcelReader().read(path)
    assert result.selected_sheet == "Customers"


def test_hidden_sheet_is_described(tmp_path: Path) -> None:
    path = write_xlsx(
        tmp_path / "hidden.xlsx",
        {
            "Visible": [["name"], ["Ada"]],
            "Secret": [["id"], [1]],
        },
        hidden={"Secret"},
    )
    inspection = ExcelReader().inspect(path)
    secret = next(sheet for sheet in inspection.sheets if sheet.name == "Secret")
    assert secret.hidden is True
    assert secret.empty is False


def test_empty_workbook(tmp_path: Path) -> None:
    path = write_xlsx(tmp_path / "blank.xlsx", {"Sheet1": []})
    with pytest.raises(EmptyDatasetError):
        ExcelReader().read(path)


def test_malformed_workbook(tmp_path: Path) -> None:
    path = tmp_path / "bad.xlsx"
    path.write_bytes(b"not-an-xlsx")
    with pytest.raises(InvalidWorkbookError):
        ExcelReader().read(path)


def test_zip_that_is_not_workbook(tmp_path: Path) -> None:
    path = tmp_path / "notes.xlsx"
    with ZipFile(path, "w") as archive:
        archive.writestr("readme.txt", "hello")
    with pytest.raises(InvalidWorkbookError):
        ExcelReader().read(path)


def test_unusual_sheet_name(tmp_path: Path) -> None:
    path = write_xlsx(
        tmp_path / "weird.xlsx",
        {"Q3 2024 (final)": [["n"], [1]]},
    )
    result = ExcelReader().read(path)
    assert result.selected_sheet == "Q3 2024 (final)"
