# Development

## Native workflow

1. Install Python 3.12 and Node.js 22 or newer.
2. From the repository root, run `make install`.
3. Start the API with `make dev-api`.
4. If running workflows asynchronously, start Redis and `make dev-worker`.
5. Start the frontend with `make dev-web`.
6. Open http://127.0.0.1:5173.

The Flask process listens on port 5050 locally to avoid macOS AirPlay Receiver on port 5000.

If PostgreSQL is configured, apply migrations before uploading files:

```bash
cd apps/api
source .venv/bin/activate
export DATABASE_URL=postgresql+psycopg://facilio:facilio_dev@localhost:5432/facilio
alembic upgrade head
```

API tests create isolated SQLite databases and temporary upload directories. They do not require PostgreSQL.

Theme, sidebar collapse, and motion preferences are stored in `localStorage` under `facilio.preferences`. Motion may be `system`, `reduced`, or `full`. Reduced motion (from Settings or `prefers-reduced-motion`, unless Full is selected) removes non-essential movement; loading, status, and focus remain. First-use cue dismissals use `facilio.onboarding.*`. They are not sent to the API.

Frontend routes other than Home are code-split. Activity list/detail polling runs only while a job is queued, running, or cancelling. Dataset analysis polling runs only while a profile is `PROFILING`. Previews stay bounded by `PREVIEW_MAX_ROWS` / `PREVIEW_MAX_COLUMNS`.

Responsive layout uses content-dependent max widths: readable copy stays narrower than data tables and the dataset workspace. Below `xl`, the cleanup builder stacks into Actions / Steps / Configure. Activity uses cards under `md`. Help becomes a full-width panel on small screens.

See [docs/ux/final-experience-polish.md](ux/final-experience-polish.md).

## Configuration

- Root `.env.example` documents Compose and API settings.
- `apps/web/.env.example` documents Vite settings.
- Do not commit `.env` files.

Upload limits:

| Variable | Default | Role |
| --- | --- | --- |
| `MAX_UPLOAD_SIZE_MB` | 16 | Authoritative file size limit |
| `MAX_CONTENT_LENGTH` | ~18 MiB | Flask request cap (allows multipart overhead) |
| `PREVIEW_MAX_ROWS` | 100 | Preview row bound |
| `PREVIEW_MAX_COLUMNS` | 200 | Preview column bound |
| `UPLOAD_ROOT` | `runtime/uploads` | Managed source files (gitignored) |
| `PROFILE_TOP_VALUES_LIMIT` | 10 | Top categorical values |
| `PROFILE_EVIDENCE_LIMIT` | 8 | Issue evidence samples |
| `PROFILE_HISTOGRAM_BINS` | 10 | Numeric histogram bins |
| `PROFILE_DUPLICATE_GROUPS_LIMIT` | 5 | Duplicate groups |
| `MAX_WORKFLOW_STEPS` | 50 | Maximum enabled steps in a workflow |
| `REDIS_URL` | unset | RQ Redis URL; empty uses an in-memory queue for tests |
| `JOB_QUEUE_NAME` | workflows | RQ queue name |
| `MAX_JOB_ATTEMPTS` | 3 | Retry ceiling per job |
| `JOB_STALE_SECONDS` | 90 | Stale running-job recovery threshold |

Production (`APP_ENV=production`) rejects weak secrets, missing `DATABASE_URL`, and wildcard CORS.

## Ingestion testing

Synthetic files live in `sample-data/`:

```bash
# after API + web are running
# Home → Upload my data (existing dialog) or Try FACILIO (allowlisted sample import)
# customers.csv / facilio-demo-customers.csv / orders.xlsx / products.json
# After ingest: Dataset workspace auto-analyzes new uploads; Analyze remains available
# Transform data → preview → apply (creates V2+; V1 original remains)
# Workflows → New workflow → add Phase 5 steps → Preview → Run
# (one successful run creates exactly one derived version)
# orders.xlsx         multi-sheet workbook (sheet selection)
# products.json       array of objects
```

Invalid fixtures belong in package/API tests, not `sample-data/`.

## Useful checks

```bash
cd apps/api && .venv/bin/ruff format --check src tests && .venv/bin/ruff check src tests && .venv/bin/pytest
cd packages/processing && .venv/bin/pytest
cd apps/web && npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
```

## Request correlation

Ingestion, profiling, transformation, and workflow logs include request ID and dataset/version/workflow/run IDs where available; they do not log row contents.

Profiling formulas, Not assessed semantics, and issue rules: [profiling.md](profiling.md). Transformations and versioning: [transformations.md](transformations.md). Workflows: [workflows.md](workflows.md). Jobs: [jobs.md](jobs.md). After pulling Phase 7, apply `alembic upgrade head` and restart the API and worker.
