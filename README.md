# FACILIO

Intelligent Data Operations Platform

FACILIO is a full-stack application for ingesting tabular files, understanding their structure and quality problems, cleaning them through guided or reusable steps, and keeping every result as an immutable dataset version.

It is a local data-operations workspace, not a cloud platform, scheduler, or AI product.

## What FACILIO can do

- Upload CSV, XLSX, and JSON (16 MB limit)
- Inspect preview, columns, and source metadata
- Analyze a version for quality issues (not automatic on upload except the sample demo path)
- Fix problems with Guided Cleanup: recommend, preview, then apply
- Save cleanup steps and run them later on compatible data
- Keep V1 original forever; every successful cleanup creates one new version
- Compare versions, restore an earlier version as current, and inspect Activity

FACILIO does **not** export cleaned files, authenticate users, schedule jobs, or use an LLM.

## Product walkthrough

1. **Public Home (`/`)** — what FACILIO is, the messy→cleaned signature, and Open FACILIO / Try the sample. Sign in / Create account are visual preparation only; authentication is not implemented.
2. **Application Home (`/overview`)** — empty, sample-only, or returning states. Upload your file or try the bundled customer sample.
3. **Dataset Overview / Data / Problems** — inspect the current version and its issues.
4. **Guided Cleanup** — select compatible fixes, preview the sequential result, apply. Apply runs in the API process and creates one derived version.
5. **History** — lineage, viewing vs using, compare with parent.
6. **Cleanups** — save the steps and run them again. Saved runs are asynchronous (Redis/RQ + worker).
7. **Activity** — job truth: waiting, running, created version, or no new version. Analysis failure after a created version is shown separately.
8. **Learn / Help / Settings** — product education, contextual Help, appearance, and truthful system status.

## Architecture

```text
Browser  →  React (Vite)  →  Flask API  →  PostgreSQL
                              Flask API  →  Redis/RQ  →  worker
                              API/worker →  packages/processing (pandas)
                              files      →  local filesystem (runtime/uploads)
```

| Path | Execution |
| --- | --- |
| Guided Cleanup apply | Synchronous in the API process. One request creates at most one version. |
| Saved Cleanup run | Asynchronous. The API persists a Job + WorkflowRun, enqueues `job_id` on Redis/RQ, and a worker executes the snapshot. |

PostgreSQL is the system of record. Redis is dispatch only.

## Technology stack

| Layer | Choices |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand |
| Backend | Python 3.12, Flask, Pydantic v2, SQLAlchemy 2, Alembic, Gunicorn |
| Engine | `packages/processing` (pandas readers, profiler, transformations) |
| Data | PostgreSQL 16 (product history), Redis 7 + RQ (saved Cleanup dispatch) |
| Quality | Ruff, pytest, ESLint, Prettier, Vitest, TypeScript strict mode |
| Node | 22 (CI / `.nvmrc`). Compatible Node `>=22` is accepted. |

## Core engineering decisions

- HTTP routes do not parse files. Services call the processing package.
- Uploaded source bytes are immutable. Cleaning writes a new version artifact.
- One Guided Cleanup or one saved Cleanup run creates at most one derived version.
- Saved Cleanup history is the run snapshot, not the later-edited Cleanup definition.
- API liveness (`/health`) is not the same as operational health. CompactHealth uses readiness plus worker/queue status.

## Data safety and version model

- V1 is `ORIGINAL` and is never overwritten.
- Derived versions point at a parent. Branching from an older version is allowed.
- **Viewing** is the version on screen. **Using** is the dataset's current version.
- Quality scores are computed, not fabricated. `INTEGRITY` is currently `NOT_ASSESSED`.

## Guided Cleanup vs reusable Cleanups

**Guided Cleanup** is a one-off: recommend → preview (not persisted) → apply. If transformations commit V2 and later analysis fails, cleanup still succeeded. The UI says the version was created and analysis needs attention. FACILIO never copies V1's profile onto V2.

**Reusable Cleanups** (internally workflow definitions) store ordered steps. **Run** returns 202, creates a Job, and needs a live worker. Retry uses the same snapshot. Run again uses the current definition.

## Activity / jobs

Activity maps real Job + output-version state:

| State | Label |
| --- | --- |
| Succeeded + output + profile ready | Completed · cleaned version created |
| Succeeded + output + profile failed | Cleaned version created · Analysis needs attention |
| Failed / cancelled, no output | Needs attention / no cleaned version |
| Queued | Waiting |
| Running | Running |

`output_version_id` is the evidence that a durable version exists, not Job status alone.

Stale `QUEUED` jobs that are missing from Redis after `JOB_STALE_SECONDS` become `FAILED` with `QUEUE_ORPHAN` (retryable). Enqueue failure marks `QUEUE_DISPATCH_FAILED` immediately. Recover: `python -m facilio.worker recover` or `POST /api/v1/operations/recover`.

## Supported formats and limits

- CSV (UTF-8), XLSX (including multi-sheet selection), JSON (array of objects)
- 16 MB upload limit
- In-memory pandas processing
- Local filesystem artifact storage
- Exact duplicate detection
- Preview bounded by `PREVIEW_MAX_ROWS` / `PREVIEW_MAX_COLUMNS`

## Local development

Prerequisites: Python 3.12, Node.js 22, PostgreSQL 16, Redis 7.

```bash
cp .env.example .env
make install
```

Canonical environment file: **repository-root `.env`**. The API and worker load only that file. `apps/api/.env` is ignored if present so they cannot silently target different databases.

```bash
make dev-api
make dev-worker
make dev-web
```

- Frontend: http://127.0.0.1:5173 (Vite proxies `/api` to the API)
- API: http://127.0.0.1:5050

## Environment configuration

Tracked: `.env.example`. Untracked: `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy URL (`postgresql+psycopg://...`) |
| `REDIS_URL` | RQ Redis URL; empty uses an in-memory queue for tests |
| `CORS_ORIGINS` | Browser origins. Production rejects `*` and requires an explicit list |
| `JOB_STALE_SECONDS` | Stale running/queued recovery threshold (default 90) |
| `WORKER_HEARTBEAT_SECONDS` | Periodic worker heartbeat (default 30) |

Startup logs `Database backend: PostgreSQL` (or SQLite) and a credential-free database identity.

SQLite is for automated tests and explicit lightweight use. It must not silently override a configured PostgreSQL URL.

## PostgreSQL setup

Create a database owned by the application user (PostgreSQL 16):

```sql
CREATE USER facilio WITH PASSWORD 'choose-a-local-password';
CREATE DATABASE facilio OWNER facilio;
```

Then:

```bash
cd apps/api
source .venv/bin/activate
# DATABASE_URL comes from the repository-root .env
alembic upgrade head
alembic current
alembic heads
```

Prefer ownership at `CREATE DATABASE` time rather than broad grants on `public`.

## Redis / worker

Saved Cleanups require Redis and `make dev-worker`. The worker heartbeats on `WORKER_HEARTBEAT_SECONDS` and recovers stale jobs at startup and on each heartbeat.

Guided Cleanup apply does not need the worker.

## Testing

```bash
make test-api
make test-processing
make test-web
```

API and processing tests use isolated SQLite databases. They do not require PostgreSQL.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Services: `db` (PostgreSQL 16), `redis`, `api` (Gunicorn), `worker` (same image), `web` (nginx serving the production Vite build). API and worker receive the same `DATABASE_URL` and `REDIS_URL`. The web container proxies `/api` to the API. Host ports: API 5050, web 8080.

Do not bake secrets into images.

## Known limitations

- 16 MB upload limit
- pandas / in-memory processing
- Local filesystem artifact storage
- CSV UTF-8
- Exact duplicate detection only
- `INTEGRITY` quality dimension is `NOT_ASSESSED`
- No authentication
- No exports
- No AI / LLM
- No scheduling, cron, or DAGs
- No multi-user collaboration

## Project status

FACILIO is a release candidate for local demonstration and review. It is not a deployed SaaS product.

See [docs/architecture.md](docs/architecture.md), [docs/development.md](docs/development.md), [docs/jobs.md](docs/jobs.md), [docs/workflows.md](docs/workflows.md), and [docs/resume-language.md](docs/resume-language.md).
