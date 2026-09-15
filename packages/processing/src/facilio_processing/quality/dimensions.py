"""Explainable quality dimensions.

Completeness
    ASSESSED when total_cells > 0.
    score = complete_cells / total_cells × 100
    Missing means null/NaN only. Empty strings are present values.

Uniqueness
    ASSESSED when row_count > 0.
    score = unique_rows / row_count × 100
    unique_rows is the number of distinct full-row tuples. Extra copies of a
    row reduce uniqueness. Repeated categorical values in a single column
    do not.

Validity
    ASSESSED only when FACILIO has a contract it can check:
    - EMAIL semantic hint: non-null values must match the email pattern
    - DATE / DATETIME inferred type: non-null values already satisfied the
      ISO/native date contract used for inference
    If no such checks apply, status is NOT_ASSESSED (not 100).

Consistency
    ASSESSED for TEXT columns with at least two non-null values, and for
    columns that already carry MIXED_TYPE_VALUES or MIXED_DATE_FORMATS.
    Each assessed column starts at 100. Penalties (capped per column at 60):
    - CASE_VARIATION: 15
    - LEADING_TRAILING_WHITESPACE: 10
    - MIXED_DATE_FORMATS: 20
    - MIXED_TYPE_VALUES: 20
    Dataset score is the mean of column scores.

Integrity
    Always NOT_ASSESSED in Phase 4. There are no foreign keys, schema
    contracts, or cross-dataset relationships to evaluate.
"""

from __future__ import annotations

from facilio_processing.profiling.jsonutil import round_score
from facilio_processing.profiling.types import ColumnProfile, DatasetProfile
from facilio_processing.quality.types import QualityDimension

_CONSISTENCY_PENALTIES = {
    "CASE_VARIATION": 15,
    "LEADING_TRAILING_WHITESPACE": 10,
    "MIXED_DATE_FORMATS": 20,
    "MIXED_TYPE_VALUES": 20,
}


def completeness(profile: DatasetProfile) -> QualityDimension:
    summary = profile.summary
    if summary.total_cells <= 0:
        return QualityDimension(
            key="COMPLETENESS",
            label="Completeness",
            score=None,
            status="NOT_ASSESSED",
            explanation=(
                "Completeness is not assessed because the dataset has no cells."
            ),
            evidence_summary="0 cells in the current profile.",
        )
    score = round_score((summary.complete_cells / summary.total_cells) * 100.0)
    return QualityDimension(
        key="COMPLETENESS",
        label="Completeness",
        score=score,
        status="ASSESSED",
        explanation=(
            f"{summary.missing_cells} of {summary.total_cells} cells are missing "
            f"(null/NaN). Empty strings are counted as present values."
        ),
        evidence_summary=(
            f"{summary.complete_cells} complete cells of {summary.total_cells}."
        ),
    )


def uniqueness(profile: DatasetProfile) -> QualityDimension:
    summary = profile.summary
    if summary.row_count <= 0:
        return QualityDimension(
            key="UNIQUENESS",
            label="Uniqueness",
            score=None,
            status="NOT_ASSESSED",
            explanation="Uniqueness is not assessed because the dataset has no rows.",
            evidence_summary="0 rows in the current profile.",
        )
    score = round_score((summary.unique_rows / summary.row_count) * 100.0)
    return QualityDimension(
        key="UNIQUENESS",
        label="Uniqueness",
        score=score,
        status="ASSESSED",
        explanation=(
            f"{summary.duplicate_rows} extra duplicate row"
            f"{'s' if summary.duplicate_rows != 1 else ''} detected across "
            f"{summary.row_count} records "
            f"({summary.unique_rows} unique row tuples)."
        ),
        evidence_summary=(
            f"{summary.unique_rows} unique rows of {summary.row_count}."
        ),
    )


def validity(profile: DatasetProfile) -> QualityDimension:
    checked = 0
    invalid = 0
    contracts: list[str] = []
    for column in profile.columns:
        if column.semantic_hint == "EMAIL" and column.non_null_count > 0:
            checked += column.non_null_count
            invalid += column.invalid_email_count
            contracts.append(f"{column.name} (email)")
        if column.detected_type in {"DATE", "DATETIME"} and column.non_null_count > 0:
            checked += column.non_null_count
            contracts.append(f"{column.name} ({column.detected_type.lower()})")
    if checked <= 0:
        return QualityDimension(
            key="VALIDITY",
            label="Validity",
            score=None,
            status="NOT_ASSESSED",
            explanation=(
                "Validity is not assessed. No email, date, or datetime contracts "
                "were established with enough evidence."
            ),
            evidence_summary="No applicable validity checks.",
        )
    valid = max(0, checked - invalid)
    score = round_score((valid / checked) * 100.0)
    return QualityDimension(
        key="VALIDITY",
        label="Validity",
        score=score,
        status="ASSESSED",
        explanation=(
            f"{valid} of {checked} checked values match their inferred contract "
            f"({', '.join(contracts)})."
        ),
        evidence_summary=f"{checked} values checked across {len(contracts)} contracts.",
    )


def consistency(profile: DatasetProfile) -> QualityDimension:
    assessed: list[tuple[str, float, list[str]]] = []
    for column in profile.columns:
        if not _consistency_applies(column):
            continue
        penalty = 0
        hits = [
            code
            for code in (
                "CASE_VARIATION",
                "LEADING_TRAILING_WHITESPACE",
                "MIXED_DATE_FORMATS",
                "MIXED_TYPE_VALUES",
            )
            if code in column.observations
        ]
        for code in hits:
            penalty += _CONSISTENCY_PENALTIES[code]
        score = round_score(max(0.0, 100.0 - min(60, penalty))) or 0.0
        assessed.append((column.name, score, hits))
    if not assessed:
        return QualityDimension(
            key="CONSISTENCY",
            label="Consistency",
            score=None,
            status="NOT_ASSESSED",
            explanation=(
                "Consistency is not assessed. There are no text columns with "
                "enough values for case, whitespace, or mixed-representation checks."
            ),
            evidence_summary="No applicable consistency checks.",
        )
    mean = round_score(sum(item[1] for item in assessed) / len(assessed))
    flagged = [item[0] for item in assessed if item[2]]
    if flagged:
        explanation = (
            "Case variation, whitespace, mixed types, or mixed date formats "
            f"were detected in: {', '.join(flagged)}."
        )
    else:
        explanation = (
            f"{len(assessed)} text columns were checked. No case, whitespace, "
            "or mixed-representation issues were detected."
        )
    return QualityDimension(
        key="CONSISTENCY",
        label="Consistency",
        score=mean,
        status="ASSESSED",
        explanation=explanation,
        evidence_summary=f"{len(assessed)} columns assessed for consistency.",
    )


def integrity(_profile: DatasetProfile) -> QualityDimension:
    return QualityDimension(
        key="INTEGRITY",
        label="Integrity",
        score=None,
        status="NOT_ASSESSED",
        explanation=(
            "Integrity is not assessed. FACILIO has no foreign keys, schema "
            "contracts, or cross-dataset relationships in this phase."
        ),
        evidence_summary="Relational rules are not configured.",
    )


def _consistency_applies(column: ColumnProfile) -> bool:
    if "MIXED_TYPE_VALUES" in column.observations or "MIXED_DATE_FORMATS" in column.observations:
        return True
    return column.detected_type == "TEXT" and column.non_null_count >= 2


