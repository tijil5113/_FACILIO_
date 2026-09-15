"""Deterministic transformation result types."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

ExampleKind = Literal["cell", "row_removed", "column_removed"]


@dataclass(frozen=True, slots=True)
class ChangeExample:
    kind: ExampleKind
    row_index: int | None = None
    column: str | None = None
    before: Any = None
    after: Any = None
    reason: str | None = None


@dataclass(frozen=True, slots=True)
class TransformationImpact:
    rows_before: int
    rows_after: int
    columns_before: int
    columns_after: int
    changed_cell_count: int
    removed_row_count: int
    removed_column_count: int
    affected_row_count: int
    no_op: bool


@dataclass(frozen=True, slots=True)
class TransformationResult:
    operation: str
    parameters: dict[str, Any]
    impact: TransformationImpact
    examples: list[ChangeExample] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    summary: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
