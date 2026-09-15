# Workflows

Reusable **Cleanups** are linear transformation pipelines. A Cleanup is a saved ordered list of operations. Public **Run** creates a WorkflowRun snapshot and a Job, then returns 202. A worker executes that snapshot. Preview and validate remain in-request.

Guided Cleanup apply is a one-off of the same engine and does not use Redis.

This is not a DAG engine, scheduler, AI generator, collaborator, or export system. Jobs: [jobs.md](jobs.md).

## Workflow vs WorkflowRun

A **Workflow** answers “what should FACILIO do?” It stores name, description, status, revision, and ordered `WorkflowStep` records (`operation_code` + parameters + enabled). It does not store dataset contents or run outcomes.

A **WorkflowRun** answers “what happened when FACILIO executed it?” It stores the input version, output version (if any), timings, quality before/after, per-step results, and an **immutable snapshot** of the definition that actually ran.

Keeping these separate means editing a workflow later cannot rewrite history. Run #12 still shows revision 1 even after the catalog definition becomes revision 4.

## Why one output version, not one per step?

Manual Transform in Phase 5 creates a version per apply because each apply is a user-visible commit. A four-step workflow is one user intent: “clean this table.” Persisting V2–V5 for intermediate frames would pollute lineage, imply recoverability of ephemeral frames, and diverge from the product rule that a run is atomic.

Execution keeps a single in-memory dataframe. Only the final frame is written as `facilio.table.v1` and attached to one `DERIVED` `DatasetVersion` whose `parent_version_id` is the input and whose `created_by_workflow_run_id` is the run.

## How historical definitions are preserved

Every run copies:

- workflow id, name, revision
- ordered **enabled** steps (operation codes and parameters)

Inspection reads `workflow_snapshot` and `WorkflowStepRun.step_snapshot`, not the live `workflows` row. Archiving the definition does not delete runs or versions.

## Sequential schema validation

Validation does **not** check every step against the original schema. It walks enabled steps in position order and updates an intermediate schema:

- `RENAME_COLUMN` changes later names
- `DROP_COLUMN` removes a name
- `CAST_TYPE` changes later types

So “rename `email` → `customer_email`” then “trim `email`” is invalid: after step 1, `email` is gone. “trim `customer_email`” is valid.

Disabled steps stay in the definition, are skipped during validation/preview/run, and do not evolve the schema.

## Portability

Workflows are not bound to a dataset UUID. Compatibility is derived from a lightweight **input contract**: columns referenced by enabled steps, with type constraints from the Phase 5 operation registry. Selecting another version yields `COMPATIBLE` or `INCOMPATIBLE` with explicit reasons (missing column, incompatible type).

## Partial failure

If step 3 fails:

- `WorkflowRun.status = FAILED`
- steps 1–2 `SUCCEEDED`, step 3 `FAILED`, later steps `SKIPPED`
- no output version
- `datasets.current_version_id` unchanged
- any partial artifact is deleted

Successful earlier steps never become dataset versions.

If the derived file is written but the database transaction fails, the artifact is deleted and the run is not marked successful.

## Why reuse the Phase 5 registry?

There is one implementation of trim, fill, cast, and so on: `facilio_processing.transformations`. Workflow steps call `apply_transformation`. Preview uses the same function on an ephemeral copy. Manual Transform and Workflow Execution cannot drift.

## Why linear instead of a DAG?

Phase 6 operations are strictly sequential. A node canvas would imply branches, joins, and cycles that the engine does not execute. The UI is an ordered pipeline because that is the semantics. Graph cycle detection is unnecessary.

## How this could become a queue later

The service already returns a completed run (HTTP 201 on success, 200 on recorded failure). A future worker could persist `PENDING`/`RUNNING`, enqueue the same `execute_pipeline` call, and emit the same `WorkflowRun` / `WorkflowStepRun` rows. The snapshot, one-output-version rule, and failure cleanup would stay. Phase 6 does not pretend that queue exists.

## Revisions

`revision` starts at 1. It increments when executable structure changes: add/remove/reorder steps, enable/disable, operation or parameters. Name/description-only edits do not increment. Clients may send `expected_revision`; a mismatch returns `WORKFLOW_CONFLICT`.

## Statuses

Workflow: `DRAFT` (no enabled steps), `READY` (structurally valid enabled steps), `INVALID` (enabled steps fail structural checks), `ARCHIVED`.

Run: `SUCCEEDED` | `FAILED` only. Execution is synchronous; `PENDING`/`RUNNING` are not persisted.

Step run: `SUCCEEDED` | `FAILED` | `SKIPPED`.

## Preview

`POST .../preview` runs the real engine in memory. It never writes a version. It returns per-step impact, bounded examples, and projected quality from profiling the ephemeral result. Entire-pipeline no-ops return `no_op: true`; the UI disables Run so FACILIO does not create an identical derived version. Preview quality is not stored as the official output profile.

## Quality

A successful run profiles the **persisted** output version using the existing profiler. Before/after scores are stored on the run. If profiling fails, the transformation still succeeded; quality is reported as unavailable / profile failed. Global Data Quality still aggregates **current** dataset versions only.

## Limits and performance

- Maximum **50** enabled steps (`MAX_WORKFLOW_STEPS`, default 50).
- In-memory pandas; bounded by the existing upload size.
- Intermediate frames are not written to disk.
- Durations use a monotonic timer on the server.
- Parameters must never hold secrets. Current operations do not take credentials; future connectors must use secret references, not snapshot plaintext.
- Logs include request/workflow/run/dataset/version IDs and counts. They do not include raw cells, preview examples, dataframes, or filesystem paths.

## Delete vs archive

If a workflow has no runs, `DELETE` may hard-delete the definition. If runs exist, delete archives instead. Archiving never cascade-deletes dataset versions created by historical runs.

## Autosave

The builder persists name on blur and step edits immediately. Save state is `Saved` / `Saving…` / `Save failed`. Failed saves are visible; FACILIO does not display Saved unless the API succeeded.

## Current version after a run

A successful run sets the new output as the dataset’s current version. A failed run does not.
