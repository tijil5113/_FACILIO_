"""Issue → registered-operation mapping for Guided Cleanup.

Same issues + same column types produce the same recommendations.
No LLM. No external APIs.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from facilio_processing.cleanup.plan import OPERATION_ORDER
from facilio_processing.transformations.catalog import get_operation
from facilio_processing.transformations.errors import UnsupportedTransformationError

GUIDED_ENGINE_VERSION = "8c.1"

Kind = Literal["actionable", "informational"]
ImpactLevel = Literal["LOW", "MODERATE", "HIGH"]
NUMERIC_TYPES = frozenset({"INTEGER", "DECIMAL"})

# Preselect only low-impact deterministic cleanup. Row removal is never
# preselected. Fill is preselected only when a numeric default exists.
# DROP_COLUMN is not offered by Guided Cleanup.


@dataclass(frozen=True, slots=True)
class ConfigurationOption:
    field: str
    label: str
    value: Any
    operation_code: str | None = None
    parameters: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class GuidedRecommendation:
    recommendation_id: str
    issue_id: str
    issue_code: str
    kind: Kind
    title: str
    explanation: str
    suggested_cleanup: str
    columns: tuple[str, ...]
    evidence: tuple[str, ...]
    affected_count: int | None
    operation_code: str | None
    default_parameters: dict[str, Any]
    options: tuple[ConfigurationOption, ...]
    required_user_configuration: bool
    impact_level: ImpactLevel | None
    previewable: bool
    applicable: bool
    not_applicable_reason: str | None
    preselected: bool
    execution_rank: int
    why: str

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["columns"] = list(self.columns)
        payload["evidence"] = list(self.evidence)
        payload["options"] = [asdict(item) for item in self.options]
        return payload


def build_recommendations(
    issues: list[dict[str, Any]],
    *,
    column_types: dict[str, str] | None = None,
) -> list[GuidedRecommendation]:
    types = {key: str(value).upper() for key, value in (column_types or {}).items()}
    results: list[GuidedRecommendation] = []
    for issue in issues:
        rec = _from_issue(issue, types)
        if rec is not None:
            results.append(rec)
    results.sort(
        key=lambda item: (
            0 if item.kind == "actionable" else 1,
            item.execution_rank,
            item.columns[0] if item.columns else "",
            item.recommendation_id,
        )
    )
    return results


def _from_issue(
    issue: dict[str, Any], column_types: dict[str, str]
) -> GuidedRecommendation | None:
    code = str(issue.get("code") or "")
    issue_id = str(issue.get("id") or issue.get("issue_key") or code)
    column = issue.get("column") or issue.get("column_name")
    column_name = str(column) if column else None
    evidence = tuple(str(item) for item in (issue.get("evidence") or [])[:8])
    affected = issue.get("affected_count")
    affected_count = int(affected) if isinstance(affected, int) else None
    dtype = column_types.get(column_name or "", "UNKNOWN")

    if code == "LEADING_TRAILING_WHITESPACE" and column_name:
        return _actionable(
            issue_id=issue_id,
            issue_code=code,
            title="Extra spaces",
            explanation=(
                f"Some values in {column_name} contain spaces before or after the text."
            ),
            suggested_cleanup="Remove extra spaces",
            why="Surrounding spaces often hide that two values are the same.",
            columns=(column_name,),
            evidence=evidence,
            affected_count=affected_count,
            operation_code="TRIM_WHITESPACE",
            parameters={"column": column_name},
            impact_level="LOW",
            preselected=True,
        )
    if code == "CASE_VARIATION" and column_name:
        examples = " · ".join(evidence[:4]) if evidence else "mixed capitalization"
        return _actionable(
            issue_id=issue_id,
            issue_code=code,
            title="Inconsistent capitalization",
            explanation=(
                f"{column_name} contains values such as:\n{examples}"
                if evidence
                else f"{column_name} uses more than one capitalization style."
            ),
            suggested_cleanup="Make text consistent",
            why="The same labels should match before grouping or filtering.",
            columns=(column_name,),
            evidence=evidence,
            affected_count=affected_count,
            operation_code="NORMALIZE_CASE",
            parameters={"column": column_name, "mode": "lowercase"},
            impact_level="LOW",
            preselected=True,
            options=(
                ConfigurationOption(
                    "mode",
                    "lowercase",
                    "lowercase",
                    "NORMALIZE_CASE",
                    {"column": column_name, "mode": "lowercase"},
                ),
                ConfigurationOption(
                    "mode",
                    "UPPERCASE",
                    "uppercase",
                    "NORMALIZE_CASE",
                    {"column": column_name, "mode": "uppercase"},
                ),
                ConfigurationOption(
                    "mode",
                    "Title Case",
                    "title",
                    "NORMALIZE_CASE",
                    {"column": column_name, "mode": "title"},
                ),
            ),
        )
    if code in {"MISSING_VALUES", "HIGH_MISSINGNESS"} and column_name:
        numeric = dtype in NUMERIC_TYPES
        high = code == "HIGH_MISSINGNESS"
        count_label = (
            f"{affected_count} missing value"
            f"{'' if affected_count == 1 else 's'}"
            if affected_count is not None
            else "missing values"
        )
        if numeric:
            options = (
                ConfigurationOption(
                    "strategy",
                    "Fill with median",
                    "median",
                    "FILL_MISSING",
                    {"column": column_name, "strategy": "median"},
                ),
                ConfigurationOption(
                    "strategy",
                    "Fill with mean",
                    "mean",
                    "FILL_MISSING",
                    {"column": column_name, "strategy": "mean"},
                ),
                ConfigurationOption(
                    "strategy",
                    "Use a value",
                    "constant",
                    "FILL_MISSING",
                    {"column": column_name, "strategy": "constant"},
                ),
                ConfigurationOption(
                    "strategy",
                    "Drop rows with missing values",
                    "drop_rows",
                    "DROP_MISSING_ROWS",
                    {"columns": [column_name]},
                ),
            )
            return _actionable(
                issue_id=issue_id,
                issue_code=code,
                title="High missingness" if high else "Missing values",
                explanation=f"{column_name} contains {count_label}.",
                suggested_cleanup="Fill missing values",
                why="True nulls can be filled, or those rows can be dropped.",
                columns=(column_name,),
                evidence=evidence,
                affected_count=affected_count,
                operation_code="FILL_MISSING",
                parameters={"column": column_name, "strategy": "median"},
                impact_level="MODERATE",
                preselected=not high,
                options=options,
            )
        options = (
            ConfigurationOption(
                "strategy",
                "Use a value",
                "constant",
                "FILL_MISSING",
                {"column": column_name, "strategy": "constant"},
            ),
            ConfigurationOption(
                "strategy",
                "Drop rows with missing values",
                "drop_rows",
                "DROP_MISSING_ROWS",
                {"columns": [column_name]},
            ),
        )
        return _actionable(
            issue_id=issue_id,
            issue_code=code,
            title="High missingness" if high else "Missing values",
            explanation=f"{column_name} contains {count_label}.",
            suggested_cleanup="Fill missing values",
            why="FACILIO needs a replacement value, or you can drop the incomplete rows.",
            columns=(column_name,),
            evidence=evidence,
            affected_count=affected_count,
            operation_code="FILL_MISSING",
            parameters={"column": column_name, "strategy": "constant"},
            impact_level="MODERATE",
            preselected=False,
            required_user_configuration=True,
            applicable=False,
            not_applicable_reason="Choose a fill value or drop the rows first.",
            options=options,
        )
    if code == "DUPLICATE_ROWS":
        count_label = (
            f"{affected_count} exact duplicate row"
            f"{'' if affected_count == 1 else 's'}"
            if affected_count is not None
            else "exact duplicate rows"
        )
        return _actionable(
            issue_id=issue_id,
            issue_code=code,
            title="Duplicate rows",
            explanation=f"FACILIO found {count_label}.",
            suggested_cleanup="Remove duplicate rows",
            why="Keeping the first exact duplicate is optional. The original version stays.",
            columns=(),
            evidence=evidence,
            affected_count=affected_count,
            operation_code="REMOVE_DUPLICATES",
            parameters={},
            impact_level="MODERATE",
            preselected=False,
        )
    return _informational(issue_id, code, column_name, evidence, affected_count, issue)


def _informational(
    issue_id: str,
    code: str,
    column_name: str | None,
    evidence: tuple[str, ...],
    affected_count: int | None,
    issue: dict[str, Any],
) -> GuidedRecommendation:
    title = str(issue.get("title") or code.replace("_", " ").title())
    explanation = str(
        issue.get("description")
        or "FACILIO detected something worth reviewing."
    )
    return GuidedRecommendation(
        recommendation_id=f"info:{issue_id}",
        issue_id=issue_id,
        issue_code=code,
        kind="informational",
        title=title,
        explanation=explanation,
        suggested_cleanup="",
        columns=(column_name,) if column_name else (),
        evidence=evidence,
        affected_count=affected_count,
        operation_code=None,
        default_parameters={},
        options=(),
        required_user_configuration=False,
        impact_level=None,
        previewable=False,
        applicable=False,
        not_applicable_reason=(
            "FACILIO found this, but it doesn't have a safe guided cleanup for it."
        ),
        preselected=False,
        execution_rank=900,
        why="This is something to review. It is not a registered automatic fix.",
    )


def _actionable(
    *,
    issue_id: str,
    issue_code: str,
    title: str,
    explanation: str,
    suggested_cleanup: str,
    why: str,
    columns: tuple[str, ...],
    evidence: tuple[str, ...],
    affected_count: int | None,
    operation_code: str,
    parameters: dict[str, Any],
    impact_level: ImpactLevel,
    preselected: bool,
    options: tuple[ConfigurationOption, ...] = (),
    required_user_configuration: bool = False,
    applicable: bool = True,
    not_applicable_reason: str | None = None,
) -> GuidedRecommendation:
    try:
        get_operation(operation_code)
    except UnsupportedTransformationError:
        return GuidedRecommendation(
            recommendation_id=f"info:{issue_id}",
            issue_id=issue_id,
            issue_code=issue_code,
            kind="informational",
            title=title,
            explanation=explanation,
            suggested_cleanup="",
            columns=columns,
            evidence=evidence,
            affected_count=affected_count,
            operation_code=None,
            default_parameters={},
            options=(),
            required_user_configuration=False,
            impact_level=None,
            previewable=False,
            applicable=False,
            not_applicable_reason=(
                "FACILIO found this, but it doesn't have a safe guided cleanup for it."
            ),
            preselected=False,
            execution_rank=900,
            why=why,
        )
    return GuidedRecommendation(
        recommendation_id=f"fix:{issue_id}:{operation_code}",
        issue_id=issue_id,
        issue_code=issue_code,
        kind="actionable",
        title=title,
        explanation=explanation,
        suggested_cleanup=suggested_cleanup,
        columns=columns,
        evidence=evidence,
        affected_count=affected_count,
        operation_code=operation_code,
        default_parameters=dict(parameters),
        options=options,
        required_user_configuration=required_user_configuration,
        impact_level=impact_level,
        previewable=True,
        applicable=applicable,
        not_applicable_reason=not_applicable_reason,
        preselected=preselected and applicable,
        execution_rank=OPERATION_ORDER.get(operation_code, 500),
        why=why,
    )
