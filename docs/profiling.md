# Profiling and data quality

Phase 4 adds a **deterministic, explainable** profiling and quality engine. It does not use an LLM, does not invent insights, and **never mutates source files**.

Profiling is **not** part of upload. A user must choose **Analyze dataset**. That keeps ingestion failures separate from analysis failures and leaves the door open for later asynchronous jobs without pretending a queue exists today.

## Architecture

```text
Stored Dataset
  → DatasetService (unchanged ingestion)
  → ProfileService
  → facilio_processing.profile_dataset
       → profile_frame (statistics)
       → evaluate_quality (scores + issues)
  → dataset_profiles / column_profiles / quality_issues
  → API
  → React (TanStack Query)
```

Flask routes do not compute pandas statistics. The processing package is independently testable.

`profile_version` is `"1.0"` and is stored with every snapshot. It is not the application version.

## Persistence

Hybrid model:

| Table | Role |
| --- | --- |
| `dataset_profiles` | One profile **per dataset version**: status, version, summary JSON, quality JSON, overall score |
| `column_profiles` | Per-column statistics JSON plus cardinality and issue count |
| `quality_issues` | Filterable/paginated issue rows with bounded evidence |

Re-profile **replaces** the profile row for that version. Other versions keep their snapshots. Global quality aggregates use each dataset’s current version only.

Statuses: `NOT_PROFILED` (no row), `PROFILING`, `READY`, `FAILED`. Dataset ingestion status stays independent.

## Type inference

Physical types: `TEXT`, `INTEGER`, `DECIMAL`, `BOOLEAN`, `DATE`, `DATETIME`, `UNKNOWN`.

Rules, in order, over **non-null** values only:

1. None → `UNKNOWN`
2. All Python bools → `BOOLEAN`
3. All strings in `{true, false}` (case-insensitive) → `BOOLEAN`. `yes`/`no`/`1`/`0` are **not** booleans.
4. All integer-valued (including integer strings) → `INTEGER`
5. All finite numbers (native or numeric strings) → `DECIMAL`. `Inf` is excluded from statistics.
6. All ISO-8601 datetimes or native datetimes with a non-midnight time → `DATETIME`
7. All ISO-8601 dates (`YYYY-MM-DD`) or native dates → `DATE`
8. Otherwise → `TEXT`

A single date-like string never promotes a column to `DATE`. Mixed representations stay `TEXT` and may produce `MIXED_DATE_FORMATS`.

Ingestion dtypes from Phase 3 are stored separately (`ingestion_dtype`) and are not rewritten.

Semantic hints (`EMAIL`, `IDENTIFIER`) never change the physical type.

## Cardinality

- Sample `row_count < 3` → `MEDIUM` (avoid UNIQUE/CONSTANT claims)
- `distinct_count ≤ 1` and `row_count ≥ 3` → `CONSTANT`
- `row_count ≥ 5`, no missing, `distinct_count == row_count` → `UNIQUE`
- `row_count ≥ 10` and distinct/non-null ≥ 0.90 → `HIGH`
- `row_count ≥ 10` and distinct/non-null ≤ 0.10, or `row_count ≥ 20` and `distinct_count ≤ 8` → `LOW`
- else → `MEDIUM`

## Missing values

Null/NaN are missing. Empty strings are **present** values and are counted separately. Tokens such as `N/A`, `NA`, `Unknown` are **not** recoded as null; they may appear as `POTENTIAL_MISSING_TOKENS`.

## Duplicates

Exact full-row comparison using typed canonical keys (null, bool, int, float, string). Extra copies (`sum(count - 1)` for keys with count > 1) are `duplicate_rows`. Groups of indices are bounded.

## Quality formulas

Each dimension is `ASSESSED` with a score in `[0, 100]` or `NOT_ASSESSED` with `score = null`.

### Completeness

Assessed when `total_cells > 0`.

`score = round(complete_cells / total_cells × 100, 1)`

Empty strings are complete.

### Uniqueness

Assessed when `row_count > 0`.

`score = round(unique_rows / row_count × 100, 1)`

This is **row** uniqueness, not categorical cardinality.

### Validity

Assessed only when a contract exists:

- `EMAIL` hint: non-null values must match a conservative email regex
- `DATE` / `DATETIME` inferred type: non-null values already matched the ISO/native contract

If neither applies, status is **Not assessed** — never a fake 100.

`score = round(valid_checked / checked × 100, 1)`

### Consistency

Assessed for `TEXT` columns with ≥ 2 non-null values, and for mixed-type / mixed-date observations.

Each such column starts at 100. Penalties (column cap 60):

| Observation | Penalty |
| --- | ---: |
| `CASE_VARIATION` | 15 |
| `LEADING_TRAILING_WHITESPACE` | 10 |
| `MIXED_DATE_FORMATS` | 20 |
| `MIXED_TYPE_VALUES` | 20 |

Dataset score = mean of those column scores.

### Integrity

**Always `NOT_ASSESSED` in Phase 4.** There are no foreign keys, schema contracts, or cross-dataset relationships. Displaying 100 would be dishonest.

### Overall score

Unweighted arithmetic mean of **ASSESSED** dimensions only.

`NOT_ASSESSED` is neither 0 nor 100. If none are assessed, overall is `NOT_ASSESSED`.

### Grades

| Score | Label |
| --- | --- |
| 90–100 | Excellent |
| 80–89.9 | Good |
| 70–79.9 | Fair |
| 60–69.9 | Needs attention |
| < 60 | Poor |

## Issues

Severity: `INFO`, `WARNING`, `CRITICAL`. Capitalization inconsistency is `INFO`.

Evidence is bounded (`PROFILE_EVIDENCE_LIMIT`, default 8). Suggested actions are deterministic. **Prepare fix** opens the Phase 5 transformation workspace with a mapped operation; it does not rewrite the uploaded source file.

## Limits and performance

| Setting | Default |
| --- | ---: |
| `PROFILE_TOP_VALUES_LIMIT` | 10 |
| `PROFILE_EVIDENCE_LIMIT` | 8 |
| `PROFILE_HISTOGRAM_BINS` | 10 |
| `PROFILE_DUPLICATE_GROUPS_LIMIT` | 5 |

Phase 4 loads the uploaded file in memory. The default upload cap is 16 MB. This is not a big-data engine.

## Privacy

Logs include dataset id and status, not cell values. Evidence is bounded. Filesystem paths are not returned. Unique-value lists are not persisted in full.

## API

| Method | Path |
| --- | --- |
| `POST` | `/api/v1/datasets/{id}/profile` |
| `GET` | `/api/v1/datasets/{id}/profile` |
| `GET` | `/api/v1/datasets/{id}/quality` |
| `GET` | `/api/v1/datasets/{id}/issues` |
| `GET` | `/api/v1/quality/summary` |

Profile, quality, and issues accept `?version=<uuid>` (defaults to the dataset’s current version). Issue filters: `severity`, `category`, `column`, `page`, `page_size`. Ordering: severity, affected percentage descending, column, code.

`GET` profile before the first run returns `404 PROFILE_NOT_FOUND`.

## Why these design choices

**Why is integrity Not assessed?** Relational integrity requires keys and contracts FACILIO does not have yet.

**Why are profiles separate from ingestion?** Isolation of failures, an explicit user action, and a clean later move to async jobs.

**Why are source files immutable?** Profiling must be reproducible and must not hide quality problems by “fixing” them.

**How does FACILIO avoid fake quality scores?** Dimensions with no evidence are Not assessed and are excluded from the overall mean.

**Why deterministic rather than AI?** Scores must be reproducible in a code review and a technical interview.
