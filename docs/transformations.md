# Transformations and immutable versions

Phase 5 adds **safe, previewable transformations** on immutable dataset versions. FACILIO never mutates uploaded source bytes and never overwrites an existing derived version. Every **manual** applied operation creates a new `DatasetVersion` with persisted lineage. Phase 6 **workflows** reuse this engine and persist **one** derived version per successful run; see [workflows.md](workflows.md).

## Version model

A **Dataset** is the logical asset (name, original filename, current pointer).

A **Dataset Version** is an immutable snapshot of that asset:

| Kind | Meaning |
| --- | --- |
| `ORIGINAL` | V1. Storage key points at the uploaded `source.<ext>`. Created at ingest or by Phase 5 backfill. |
| `DERIVED` | Vn. Written under `{dataset_id}/versions/{version_id}/data.ftable.json`. |

Version numbers are sequential and unique per dataset (`1, 2, 3, …`). Parent relationships define the graph. Branching is allowed: two children may share the same parent. Concurrent applies rely on the unique `(dataset_id, version_number)` constraint inside a transaction, not on `max(version)+1` alone.

### Current version

`datasets.current_version_id` is the working pointer.

- A successful apply sets the new version as current.
- **Restore as current** only updates the pointer. Later versions are kept.
- Undo is not a reverse transform.

Preview, columns, quality, and issues always reflect the **selected** version (`?version=<uuid>`), defaulting to current.

### Original vs derived in the UI

The Source tab describes the **uploaded file**. Derived artifacts are internal and are not presented as user uploads.

## Why never modify source files?

Ingestion and profiling must remain reproducible. Cleaning during upload would hide the issues Phase 4 exists to report. Recruiters (and audits) can return to V1 and see the original values.

## Why every transformation creates a version?

In-place mutation loses history and makes “undo” a guess. Immutable versions give lineage, comparison, and safe branching without reconstructing operations from UI state.

## Preview vs apply

`POST .../transformations/preview` runs the same engine as apply, then **discards** the frame. It does not write storage or rows.

`POST .../transformations` validates, writes the derived artifact, inserts `dataset_versions` + `transformations`, updates current, then profiles the new version. If profiling fails, the version remains; profile status is `FAILED` and can be retried. If database persistence fails after a file write, the derived prefix is deleted.

No-op previews (`impact.no_op`) cannot be applied (`TRANSFORMATION_NOOP`). FACILIO does not create identical copies.

Preview samples are bounded (10 examples). Cell examples include column + before/after only — not the rest of the row. Samples are not logged and are not stored on the transformation record beyond impact counts and a short summary.

## Engine

Core logic lives in `packages/processing` (`facilio_processing.transformations`). Flask orchestrates. React configures and displays. There is no `eval`, `exec`, SQL fragment, regex engine, or user-supplied Python.

Registered operations:

| Code | Category |
| --- | --- |
| `TRIM_WHITESPACE` | Clean text |
| `NORMALIZE_CASE` | Clean text (`lowercase` / `uppercase` / `title`) |
| `REPLACE_VALUE` | Clean text (exact, case-sensitive) |
| `FILL_MISSING` | Missing (`constant`; `mean`/`median` for numeric) |
| `DROP_MISSING_ROWS` | Missing (`any` / `all`; true nulls only) |
| `REMOVE_DUPLICATES` | Rows (keep first; optional column subset) |
| `RENAME_COLUMN` | Columns |
| `DROP_COLUMN` | Columns (last column protected) |
| `CAST_TYPE` | Columns (rejects incompatible values with bounded evidence) |

Empty strings are **not** null unless a later operation says so (Phase 4 distinction).

High-impact warning: if a row-removal operation would drop **≥ 25%** of rows, preview includes a deterministic warning. Apply is not blocked.

Catalog: `GET /api/v1/transformations`.

## Internal storage: `facilio.table.v1`

Derived versions are **not** rewritten as CSV/XLSX. They use a JSON table document:

- format name `facilio.table.v1`
- column order and conservative dtypes
- JSON `null` for missing cells
- strings, numbers, booleans, ISO-8601 dates

CSV would lose type/null fidelity. Parquet would add pyarrow. This format is internal only — not an export.

Original uploads stay `{dataset_id}/source.{ext}`.

## Lineage

`transformations` rows store `input_version_id`, `output_version_id`, `operation_code`, structured parameters, impact summary, and timestamp.

`GET .../versions/{id}/lineage` walks **ancestors** of the selected version (not unrelated branches).

`GET .../versions/{id}/comparison` compares a derived version with its parent using the persisted transformation impact plus quality delta when both profiles exist.

## Profiles per version

Each version has its own `dataset_profiles` row (`version_id` unique). V1 quality is never overwritten by V2.

After apply, FACILIO profiles the new version synchronously (datasets remain bounded by the 16 MB upload cap). Quality delta is `after - before` on overall score and assessed dimensions. Deltas may be zero or negative.

Global Data Quality (`GET /api/v1/quality/summary`) uses each dataset’s **current** version only. Historical versions do not inflate dataset counts.

## Issue → suggested action

Phase 4 issue codes map deterministically to operations (`LEADING_TRAILING_WHITESPACE` → trim, `CASE_VARIATION` → normalize case, `DUPLICATE_ROWS` → remove duplicates, numeric missing → fill, and so on). The UI label is **Prepare fix**. Nothing is auto-applied. There is no Fix all / Auto clean.

## Failed persistence

If the in-memory transform succeeds and the file is written but the database commit fails, orchestration deletes the derived prefix and does not leave a `DatasetVersion` row. Dataset delete nulls `current_version_id`, cascades versions/profiles/issues/transformations, and removes `{dataset_id}/` in storage.

## Performance

Transformations run in-process with pandas on the bounded upload size. There is no distributed execution and no large-data claim. Saved Cleanups reuse this engine on the RQ worker; a single Transform apply still runs in the API request.

## Security and logging

Logs may include dataset id, version id, operation code, duration, change counts, and request id. They must not include cell values, replacement samples, or filesystem paths.

## API

| Method | Path |
| --- | --- |
| `GET` | `/api/v1/transformations` |
| `GET` | `/api/v1/workspace/summary` |
| `GET` | `/api/v1/datasets/{id}/versions` |
| `GET` | `/api/v1/datasets/{id}/versions/{vid}` |
| `GET` | `/api/v1/datasets/{id}/versions/{vid}/preview` |
| `GET` / `POST` | `/api/v1/datasets/{id}/versions/{vid}/profile` |
| `GET` | `/api/v1/datasets/{id}/versions/{vid}/lineage` |
| `GET` | `/api/v1/datasets/{id}/versions/{vid}/comparison` |
| `POST` | `/api/v1/datasets/{id}/versions/{vid}/transformations/preview` |
| `POST` | `/api/v1/datasets/{id}/versions/{vid}/transformations` |
| `PATCH` | `/api/v1/datasets/{id}/current-version` |

Profile and issues on the dataset resource accept `?version=`.

Representative error codes: `VERSION_NOT_FOUND`, `INVALID_TRANSFORMATION`, `UNSUPPORTED_TRANSFORMATION`, `INVALID_TRANSFORMATION_PARAMETERS`, `COLUMN_NOT_FOUND`, `COLUMN_NAME_CONFLICT`, `INCOMPATIBLE_COLUMN_TYPE`, `CAST_FAILED`, `NO_NUMERIC_VALUES`, `TRANSFORMATION_FAILED`, `PREVIEW_FAILED`, `LAST_COLUMN_CANNOT_BE_DROPPED`, `TRANSFORMATION_NOOP`.
