"""Deterministic issue-to-operation suggestions. Not AI."""

from __future__ import annotations

from typing import Any

_MAP: dict[str, list[dict[str, Any]]] = {
    "LEADING_TRAILING_WHITESPACE": [
        {
            "code": "TRIM_WHITESPACE",
            "display_name": "Trim whitespace",
            "reason": "Whitespace padding can be removed without changing meaning.",
        }
    ],
    "CASE_VARIATION": [
        {
            "code": "NORMALIZE_CASE",
            "display_name": "Normalize case",
            "reason": "Standardize capitalization with an explicit case mode.",
            "parameters": {"mode": "lowercase"},
        }
    ],
    "DUPLICATE_ROWS": [
        {
            "code": "REMOVE_DUPLICATES",
            "display_name": "Remove duplicate rows",
            "reason": "Keep the first occurrence of exact duplicate rows.",
        }
    ],
    "MISSING_VALUES": [
        {
            "code": "FILL_MISSING",
            "display_name": "Fill missing values",
            "reason": "Replace true nulls with a constant or, for numeric columns, mean or median.",
            "parameters": {"strategy": "constant"},
        },
        {
            "code": "DROP_MISSING_ROWS",
            "display_name": "Drop rows with missing values",
            "reason": "Remove rows where the selected column is null.",
        },
    ],
    "HIGH_MISSINGNESS": [
        {
            "code": "FILL_MISSING",
            "display_name": "Fill missing values",
            "reason": "High missingness can be filled explicitly after review.",
            "parameters": {"strategy": "constant"},
        },
        {
            "code": "DROP_MISSING_ROWS",
            "display_name": "Drop rows with missing values",
            "reason": "Dropping incomplete rows is available after preview.",
        },
    ],
    "EMPTY_STRINGS": [
        {
            "code": "REPLACE_VALUE",
            "display_name": "Replace exact value",
            "reason": "Empty strings are distinct from null. Replace them only if intended.",
            "parameters": {"find": ""},
        }
    ],
    "MIXED_TYPE_VALUES": [
        {
            "code": "CAST_TYPE",
            "display_name": "Change type",
            "reason": "Attempt a conservative conversion after reviewing incompatible values.",
        }
    ],
}


def suggested_operations_for_issue(
    code: str, column: str | None = None
) -> list[dict[str, Any]]:
    suggestions: list[dict[str, Any]] = []
    for item in _MAP.get(code, []):
        parameters = dict(item.get("parameters") or {})
        if column:
            if item["code"] == "DROP_MISSING_ROWS":
                parameters.setdefault("columns", [column])
            elif item["code"] != "REMOVE_DUPLICATES":
                parameters.setdefault("column", column)
        suggestions.append(
            {
                "code": item["code"],
                "display_name": item["display_name"],
                "reason": item["reason"],
                "parameters": parameters,
            }
        )
    return suggestions
