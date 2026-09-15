"""Deterministic quality issues with bounded evidence."""

from __future__ import annotations

from facilio_processing.profiling.limits import ProfileLimits
from facilio_processing.profiling.patterns import observation_evidence
from facilio_processing.profiling.types import ColumnProfile, DatasetProfile
from facilio_processing.quality.types import IssueSeverity, QualityIssue

_SEVERITY_MISSING = ((80, "CRITICAL"), (40, "WARNING"), (0, "INFO"))


def build_issues(
    profile: DatasetProfile,
    values_by_column: dict[int, list] | None = None,
    *,
    limits: ProfileLimits,
) -> list[QualityIssue]:
    issues: list[QualityIssue] = []
    summary = profile.summary
    if summary.duplicate_rows > 0:
        pct = summary.duplicate_percentage or 0.0
        issues.append(
            QualityIssue(
                id="DUPLICATE_ROWS:*",
                code="DUPLICATE_ROWS",
                category="UNIQUENESS",
                severity=_severity_from_pct(pct, warning=5, critical=25),
                title="Duplicate rows",
                description=(
                    f"{summary.duplicate_rows} extra duplicate row"
                    f"{'s' if summary.duplicate_rows != 1 else ''} found among "
                    f"{summary.row_count} records."
                ),
                column=None,
                affected_count=summary.duplicate_rows,
                affected_percentage=summary.duplicate_percentage,
                evidence=[
                    f"rows {', '.join(str(i) for i in group.row_indices)}"
                    for group in summary.duplicate_groups[: limits.evidence]
                ],
                suggested_action="Review duplicate records before downstream analysis.",
            )
        )
    for column in profile.columns:
        values = (values_by_column or {}).get(column.position, [])
        issues.extend(_column_issues(column, values, limits=limits))
    return issues


def _column_issues(
    column: ColumnProfile,
    values: list,
    *,
    limits: ProfileLimits,
) -> list[QualityIssue]:
    issues: list[QualityIssue] = []
    if column.null_count > 0:
        high = "HIGH_MISSINGNESS" in column.observations
        code = "HIGH_MISSINGNESS" if high else "MISSING_VALUES"
        pct = column.null_percentage or 0.0
        issues.append(
            _issue(
                column,
                code=code,
                category="COMPLETENESS",
                severity=_missing_severity(pct),
                title="High missingness" if high else "Missing values",
                description=(
                    f"{column.null_count} null values in {column.name} "
                    f"({_pct(column.null_percentage)} of rows)."
                ),
                affected_count=column.null_count,
                affected_percentage=column.null_percentage,
                evidence=[],
                suggested_action=f"Review missing {column.name} values.",
            )
        )
    if column.empty_string_count > 0:
        issues.append(
            _issue(
                column,
                code="EMPTY_STRINGS",
                category="COMPLETENESS",
                severity="INFO",
                title="Empty strings",
                description=(
                    f"{column.empty_string_count} empty-string values in {column.name}. "
                    "They are distinct from null."
                ),
                affected_count=column.empty_string_count,
                affected_percentage=_ratio(column.empty_string_count, column.row_count),
                evidence=[""],
                suggested_action="Decide whether empty strings should be treated as missing later.",
            )
        )
    if "LEADING_TRAILING_WHITESPACE" in column.observations:
        issues.append(
            _issue(
                column,
                code="LEADING_TRAILING_WHITESPACE",
                category="CONSISTENCY",
                severity="INFO",
                title="Leading or trailing whitespace",
                description=f"Whitespace padding was observed in {column.name}.",
                affected_count=column.whitespace_count,
                affected_percentage=_ratio(column.whitespace_count, column.row_count),
                evidence=observation_evidence(
                    "LEADING_TRAILING_WHITESPACE", values, limits=limits
                ),
                suggested_action="Trim whitespace before analysis if these values should match.",
            )
        )
    if "CASE_VARIATION" in column.observations:
        issues.append(
            _issue(
                column,
                code="CASE_VARIATION",
                category="CONSISTENCY",
                severity="INFO",
                title="Case variation",
                description=(
                    f"The same logical labels appear with different capitalization in "
                    f"{column.name}."
                ),
                affected_count=column.case_variant_value_count,
                affected_percentage=_ratio(
                    column.case_variant_value_count, column.row_count
                ),
                evidence=observation_evidence("CASE_VARIATION", values, limits=limits),
                suggested_action="Standardize capitalization before downstream analysis.",
            )
        )
    if "POTENTIAL_MISSING_TOKENS" in column.observations:
        issues.append(
            _issue(
                column,
                code="POTENTIAL_MISSING_TOKENS",
                category="COMPLETENESS",
                severity="INFO",
                title="Potential missing-value tokens",
                description=(
                    f"{column.name} contains tokens such as N/A or Unknown. "
                    "They were not reclassified as null."
                ),
                affected_count=column.potential_missing_token_count,
                affected_percentage=_ratio(
                    column.potential_missing_token_count, column.row_count
                ),
                evidence=observation_evidence(
                    "POTENTIAL_MISSING_TOKENS", values, limits=limits
                ),
                suggested_action="Review whether these tokens should be treated as missing later.",
            )
        )
    if "MIXED_TYPE_VALUES" in column.observations:
        issues.append(
            _issue(
                column,
                code="MIXED_TYPE_VALUES",
                category="CONSISTENCY",
                severity="WARNING",
                title="Mixed numeric and text values",
                description=f"{column.name} contains both numeric-looking and non-numeric values.",
                affected_count=column.non_null_count,
                affected_percentage=column.distinct_percentage,
                evidence=observation_evidence("MIXED_TYPE_VALUES", values, limits=limits),
                suggested_action="Review mixed representations before numeric analysis.",
            )
        )
    if "MIXED_DATE_FORMATS" in column.observations:
        issues.append(
            _issue(
                column,
                code="MIXED_DATE_FORMATS",
                category="CONSISTENCY",
                severity="WARNING",
                title="Multiple date representations",
                description=(
                    f"{column.name} appears to use more than one date format. "
                    "Values were not parsed or rewritten."
                ),
                affected_count=column.non_null_count,
                affected_percentage=None,
                evidence=observation_evidence("MIXED_DATE_FORMATS", values, limits=limits),
                suggested_action="Standardize date formats in a later cleaning step.",
            )
        )
    if "CONSTANT_COLUMN" in column.observations:
        issues.append(
            _issue(
                column,
                code="CONSTANT_COLUMN",
                category="STRUCTURE",
                severity="INFO",
                title="Constant column",
                description=f"{column.name} has a single distinct non-null value (or none).",
                affected_count=column.row_count,
                affected_percentage=100.0 if column.row_count else None,
                evidence=[],
                suggested_action="Confirm whether this column is informative.",
            )
        )
    if "INVALID_EMAIL_FORMAT" in column.observations:
        issues.append(
            _issue(
                column,
                code="INVALID_EMAIL_FORMAT",
                category="VALIDITY",
                severity="WARNING",
                title="Invalid email format",
                description=(
                    f"{column.invalid_email_count} value"
                    f"{'s' if column.invalid_email_count != 1 else ''} in {column.name} "
                    "do not match a conservative email pattern."
                ),
                affected_count=column.invalid_email_count,
                affected_percentage=_ratio(
                    column.invalid_email_count, column.non_null_count
                ),
                evidence=observation_evidence("INVALID_EMAIL_FORMAT", values, limits=limits),
                suggested_action="Review malformed email values.",
            )
        )
    if "HIGH_CARDINALITY" in column.observations and column.semantic_hint != "IDENTIFIER":
        issues.append(
            _issue(
                column,
                code="HIGH_CARDINALITY",
                category="STRUCTURE",
                severity="INFO",
                title="High cardinality",
                description=f"{column.name} has a high ratio of distinct values.",
                affected_count=column.distinct_count,
                affected_percentage=column.distinct_percentage,
                evidence=[],
                suggested_action="Treat this column as an identifier or free text as appropriate.",
            )
        )
    return issues


def _issue(
    column: ColumnProfile,
    *,
    code: str,
    category: str,
    severity: IssueSeverity,
    title: str,
    description: str,
    affected_count: int,
    affected_percentage: float | None,
    evidence: list[str],
    suggested_action: str,
) -> QualityIssue:
    return QualityIssue(
        id=f"{code}:{column.name}",
        code=code,
        category=category,  # type: ignore[arg-type]
        severity=severity,
        title=title,
        description=description,
        column=column.name,
        affected_count=affected_count,
        affected_percentage=affected_percentage,
        evidence=evidence[:8],
        suggested_action=suggested_action,
    )


def _severity_from_pct(pct: float, *, warning: float, critical: float) -> IssueSeverity:
    if pct >= critical:
        return "CRITICAL"
    if pct >= warning:
        return "WARNING"
    return "INFO"


def _missing_severity(pct: float) -> IssueSeverity:
    if pct >= 80:
        return "CRITICAL"
    if pct >= 40:
        return "WARNING"
    return "INFO"


def _pct(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.1f}%"


def _ratio(part: int, whole: int) -> float | None:
    if whole <= 0:
        return None
    return round((part / whole) * 100.0, 4)
