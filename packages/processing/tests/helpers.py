"""Processing test helpers."""

from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook


def write_csv(path: Path, content: str, *, encoding: str = "utf-8") -> Path:
    path.write_text(content, encoding=encoding)
    return path


def write_json(path: Path, content: str) -> Path:
    path.write_text(content, encoding="utf-8")
    return path


def write_xlsx(
    path: Path,
    sheets: dict[str, list[list[object]]],
    *,
    hidden: set[str] | None = None,
) -> Path:
    workbook = Workbook()
    default = workbook.active
    first = True
    for name, rows in sheets.items():
        worksheet = default if first else workbook.create_sheet(title=name)
        if first:
            worksheet.title = name
            first = False
        for row in rows:
            worksheet.append(row)
        if hidden and name in hidden:
            worksheet.sheet_state = "hidden"
    if first:
        default.title = "Sheet1"
    workbook.save(path)
    return path
