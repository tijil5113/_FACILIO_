# Jobs

Phase 7 moves **public workflow execution** out of the HTTP request and into a real asynchronous job architecture.

## Why leave HTTP?

A Flask request is a poor place to run a multi-step pandas pipeline. The client would wait on an open connection, timeouts would look like product failures, and a process restart would lose in-flight work with no durable record. FACILIO now **persists first**, enqueues a `job_id`, and returns **202 Accepted**.

## Redis vs PostgreSQL

| Store | Role |
| --- | --- |
| PostgreSQL | Product-visible job history, attempts, progress, errors |
| Redis + RQ | Dispatch only. Payload is `{job_id}` |

If Redis is flushed after success, FACILIO still knows the job succeeded. Redis is not the system of record.

**Queue choice:** Redis and [RQ](https://python-rq.org/). FACILIO needs queueing, a worker process, retries, and job IDs — not Celery’s broker/result-backend platform.

## Job vs WorkflowRun

- **WorkflowRun** is the domain record: which immutable snapshot ran against which input version, and which output version (if any) was committed.
- **Job** is the operational unit: queue, claim, attempts, heartbeat, cancel, retry.

One Job corresponds to one WorkflowRun. Retries add **JobAttempt** rows; they do not invent extra runs or extra output versions.

## Lifecycle

```text
QUEUED → RUNNING → SUCCEEDED
QUEUED → CANCELLED
RUNNING → FAILED | CANCEL_REQUESTED → CANCELLED
FAILED → QUEUED   (manual retry, if retryable)
```

Invalid transitions raise `JOB_INVALID_STATE`.

## Dispatch consistency

The API commits the run and job, then enqueues. If Redis enqueue fails, the job is marked **FAILED** with `QUEUE_DISPATCH_FAILED` (retryable). There is no transactional outbox in Phase 7. The consistency window is: durable QUEUED row, then a best-effort enqueue. Recovery is retry of that failed job.

## Worker

```bash
make dev-worker
# or
python -m facilio.worker
python -m facilio.worker recover
```

The worker creates a Flask application **without** serving HTTP, claims the job with a row lock (`SELECT … FOR UPDATE`), loads the **WorkflowRun snapshot** (not the latest editable workflow), and calls Phase 6 `execute_pipeline` → Phase 5 `apply_transformation`.

RQ finishes the current job on SIGTERM/SIGINT; FACILIO then marks the worker heartbeat `STOPPING`. Database sessions are opened per unit of work and closed.

## Claiming and idempotency

Two workers cannot run the same FACILIO job: only `QUEUED` rows are claimable, under a lock. Duplicate RQ delivery of a succeeded job is a no-op. Duplicate finalization is blocked by `run.output_version_id` and a unique constraint on `dataset_versions.created_by_workflow_run_id`.

## Progress

`progress_total` is the number of **enabled** snapshot steps. `progress_current` is the number of **SUCCEEDED** steps. The UI may show “75% steps complete”; that is **not** elapsed runtime.

## Cancellation

Queued jobs cancel immediately. Running jobs are **cooperative**: `CANCEL_REQUESTED`, then the worker stops **between** Phase 5 steps. Pandas is not interrupted mid-operation. If the output version is already committed, cancel is rejected (`JOB_CANCEL_NOT_ALLOWED`).

## Retry vs Run again

| Action | Meaning |
| --- | --- |
| Retry | Same Job + same WorkflowRun snapshot. New JobAttempt. Only if `retryable` and attempts remain. |
| Run again | New run/job from the **current** workflow revision. |

Deterministic data failures (`CAST_FAILED`, `COLUMN_NOT_FOUND`, `WORKFLOW_INCOMPATIBLE`) are **not** retryable. `WORKER_LOST` and queue dispatch failures are.

Default `MAX_JOB_ATTEMPTS=3`.

## Worker crash

Workers write `jobs.heartbeat_at` at start, between steps, and during finalization. `POST /api/v1/operations/recover` (and worker startup) marks `RUNNING`/`CANCEL_REQUESTED` rows with a stale heartbeat as **FAILED / WORKER_LOST** unless an output version already exists (then the job is finalized as succeeded). FACILIO does not auto-re-execute a lost in-flight pipeline; the user retries.

## Polling

The UI uses TanStack Query. Active jobs poll every 1.5–2s. Terminal jobs stop. WebSockets are not implemented.

## Local development

Without Redis, the API uses an in-memory queue for tests and local unit work. **Product async execution** needs Redis plus `make dev-worker`.

Docker Compose runs `postgres`, `redis`, `api`, `worker`, and `web`. API and worker share the application image and differ only by command.

## Retention

Completed jobs are **not** deleted in Phase 7. Historical operational records stay in PostgreSQL.

## Scaling later

Multiple RQ workers can share the `workflows` queue. Safety remains the database claim, not Redis uniqueness. Horizontal scale does not require changing the Phase 6 executor.
