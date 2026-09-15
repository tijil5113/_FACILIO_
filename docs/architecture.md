# Architecture

FACILIO is a local data-operations workspace: ingest, profile, clean, and version tabular data. Scheduling, DAG graphs, AI, authentication, and exports are not implemented.

## Backend

The Flask application is created by `facilio.app.create_app`.

| Layer | Responsibility |
| --- | --- |
| `api/v1` | HTTP routes and status codes |
| `schemas` | Request and response contracts |
| `services` | Application behavior (ingestion, profiling, transformation orchestration) |
| `repositories` | Persistence access |
| `storage` | Managed source and derived-file storage |
| `models` | SQLAlchemy entities |
| `db` | Engine, session factory, declarative base |
| `jobs` / `worker` | Queue adapter, periodic heartbeat, RQ tasks |

Health (`GET /api/v1/health`) does not import pandas and does not prove the worker is running. Readiness probes the database and Redis when `REDIS_URL` is set. CompactHealth also uses `GET /api/v1/operations/health` (queue + worker heartbeat).

Public **saved Cleanup Run** dispatches a job; the worker calls the same pipeline as Guided Cleanup. Guided **Apply** executes that pipeline inside the API request.

Details: [jobs.md](jobs.md).

## Ingestion flow

```text
HTTP upload
  → DatasetService
  → size / emptiness checks
  → LocalStorageService (generated id / source.<ext>)
  → processing detect + reader
  → Dataset + DatasetVersion V1 ORIGINAL
  → API envelope
```

If an XLSX workbook has multiple usable sheets, the file is staged and the API returns `SHEET_SELECTION_REQUIRED` with `staging_id` and sheet metadata. A second `POST /api/v1/datasets` with `staging_id` and `sheet` completes ingestion without re-uploading.

Failed parses delete the stored file. Failed database commits also delete the stored file. Staging rows older than 24 hours are purged on the next upload.

## Source integrity

The uploaded bytes are immutable source material. Ingestion and profiling inspect, classify, and persist **metadata**. They do not drop rows, fill nulls, rename columns, or rewrite cell values. Cleaning happens only as an explicit transformation that writes a **new** version.

## Transformation flow

```text
Dataset version
  → TransformationService
  → validate operation + parameters
  → facilio_processing.transformations (preview or apply)
  → derived facilio.table.v1 artifact (apply only)
  → DatasetVersion + Transformation
  → profile new version (non-fatal)
  → API
  → React transformation workspace
```

Details: [transformations.md](transformations.md).

## Workflow flow

```text
Saved Cleanup (ordered steps)
  → WorkflowService
  → sequential schema validation (processing)
  → WorkflowService.dispatch_run (Job + WorkflowRun QUEUED)
  → Redis/RQ payload: job_id
  → worker claims Job
  → execute_pipeline → apply_transformation
  → one derived DatasetVersion (success only)
  → WorkflowRun + Job + JobAttempt finalized
```

Guided Cleanup apply uses the same executor **inside the API process** (no Redis required). Saved Cleanup **Run** is asynchronous and requires Redis plus a worker.

Details: [workflows.md](workflows.md).

## Frontend

| Area | Responsibility |
| --- | --- |
| `app` | Bootstrap, providers, router |
| `components/layout` | Application chrome |
| `components/ui` | Shared primitives |
| `features/datasets` | Upload, table, preview grid, rename/delete, query keys |
| `features/transform` | Transformation workspace, history, quality delta |
| `features/workflows` | Builder, catalog queries |
| `features/profile` | Quality, columns, issues |
| `services` | Typed API client |
| `stores` | Zustand client preferences and UI chrome only |
| `pages` | Route-level screens |

Dataset server state lives in TanStack Query (`datasets` / detail / preview / profile / versions / lineage / catalog). Preferences stay in Zustand. Selected version is a URL search param (`?version=`).

## Processing

`packages/processing` exposes `read_dataset`, `preview_dataset`, `inspect_workbook`, `profile_dataset`, `profile_table`, the transformation registry, and `workflows.preview_pipeline` / `execute_pipeline`. Formula detail: [profiling.md](profiling.md). Transformation contract: [transformations.md](transformations.md). Workflows: [workflows.md](workflows.md).

| Format | Behavior |
| --- | --- |
| CSV | UTF-8 / UTF-8 BOM; delimiter sniffing for comma, semicolon, tab, pipe |
| XLSX | Cached cell values only (formulas are not executed); sheet selection when needed |
| JSON | Array of objects, or an object of equal-length arrays |
| `facilio.table.v1` | Internal derived JSON table; not an export format |

JSON objects/arrays nested in a cell are stored as JSON text, not flattened into extra columns.

Empty-content rule: a file with no usable tabular structure is rejected. A CSV/XLSX header with zero data rows is a valid empty dataset (`row_count = 0`). An empty JSON array is rejected.

## Persistence

PostgreSQL stores **metadata only** (`datasets`, `dataset_versions`, `transformations`, `staging_uploads`, `dataset_profiles`, `column_profiles`, `quality_issues`, `workflows`, `workflow_steps`, `workflow_runs`, `workflow_step_runs`). Managed storage holds original files and derived `facilio.table.v1` documents under `UPLOAD_ROOT`.

Tests use SQLite files in a temporary directory and a temporary upload root. They never write into developer `runtime/uploads`.

## Dataset lifecycle

`pending` / `processing` exist on the dataset model. Successful ingestion creates `ready` datasets. Profile status is per **version**. Guided Cleanup apply is in-request. Saved Cleanup runs are queued jobs.
