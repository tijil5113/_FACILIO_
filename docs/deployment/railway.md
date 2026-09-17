# Railway production deployment

This document describes how to deploy FACILIO on Railway. It matches the
repository as implemented. It is not a claim that a production environment
already exists.

Do not put production secrets in git. Do not guess public domains in source.

## Architecture

Railway services:

1. **FACILIO WEB** — nginx serving the production Vite SPA
2. **FACILIO BACKEND** — Gunicorn API **and** the RQ worker in the **same**
   container
3. **PostgreSQL** — private Railway plugin / service
4. **Redis** — private Railway plugin / service
5. **One persistent volume** attached to FACILIO BACKEND at
   `/app/runtime/uploads`

```text
Browser  →  FACILIO WEB (nginx + SPA)
         →  FACILIO BACKEND public origin (Gunicorn /api/v1)
                Gunicorn  ──┐
                RQ worker ──┼─ same container, same env, same UPLOAD_ROOT
                PostgreSQL (private)
                Redis (private, job dispatch only)
                Volume /app/runtime/uploads
```

### Why API and worker are collocated

`LocalStorageService` writes dataset source files and derived
`facilio.table.v1` artifacts on the local filesystem under `UPLOAD_ROOT`.
Saved Cleanup runs execute in the worker and must read those same files.

This release therefore runs Gunicorn and `python -m facilio.worker` inside
one Railway service so both processes share one mounted volume.

A later object-storage backend could allow a separate worker service. That
is **not** implemented. Do not add a second Railway worker service while
storage remains local.

Local Docker Compose can still run **separate** `api` and `worker`
containers because they share the named volume `facilio_uploads`. The
backend image default (`api-and-worker`) is overridden in Compose.

## Repository layout for Railway

| Service | Root directory | Dockerfile | Context |
| --- | --- | --- | --- |
| FACILIO BACKEND | repository root | `apps/api/Dockerfile` | repository root |
| FACILIO WEB | `apps/web` | `Dockerfile` | `apps/web` |

Source repository: `tijil5113/_FACILIO_`.

## FACILIO BACKEND

### Build

- Builder: Dockerfile
- Dockerfile path: `apps/api/Dockerfile`
- Root directory: empty / repository root

The image:

- installs `packages/processing` and `facilio-api` (including `apps/api/README.md`)
- copies real `sample-data/` to `/app/sample-data` (Try the sample)
- sets `ENTRYPOINT` to `/app/scripts/docker-entrypoint.sh`
- defaults `CMD` to `api-and-worker`

### Start command

Leave empty to use the image default, or set:

```text
api-and-worker
```

That launches:

```text
gunicorn --bind 0.0.0.0:${PORT} --workers 2 --timeout 120 facilio.wsgi:app
python -m facilio.worker
```

`PORT` comes from Railway. Do not hardcode it.

Do **not** put `alembic upgrade head` in the start command. Do **not** set
the start command to Gunicorn alone (the worker would not run).

### Pre-deploy command

```text
alembic upgrade head
```

Migrations run against `DATABASE_URL` before the new container starts
serving traffic. The start script does not migrate.

### Healthcheck

```text
/api/v1/readiness
```

Readiness probes PostgreSQL and Redis. It does **not** require a live
worker heartbeat.

Worker availability remains at `/api/v1/operations/health` for the product
UI (Activity / Settings). Do not use that path as the Railway deploy
healthcheck: a rolling restart would look unready while the worker process
is still starting.

### Volume

Mount one Railway volume at:

```text
/app/runtime/uploads
```

Set `UPLOAD_ROOT=/app/runtime/uploads` on the backend service so API and
worker resolve the same absolute path.

### Process user and volume permissions

The backend image starts as root only long enough to create/chown
`UPLOAD_ROOT`, then **drops to uid 1000** (`facilio`) with `gosu` before
Gunicorn and the worker start. Application code does not run privileged
logic.

Leave `RAILWAY_RUN_UID` unset so the entrypoint can chown the volume.

If Railway is forced to a non-root UID before the volume is writable, the
entrypoint fails clearly. In that case set:

```text
RAILWAY_RUN_UID=0
```

so the entrypoint can chown the mount and drop privileges. Do not run the
API/worker as root as a standing configuration.

## FACILIO WEB

- Root directory: `apps/web`
- Dockerfile: `Dockerfile`
- Start command: image default (`nginx`)
- Healthcheck: `/health` (plain `ok`, HTTP 200)

The SPA talks to the **public** FACILIO BACKEND origin through
**build-time** `VITE_API_BASE_URL`. nginx does not proxy `/api` and does
not use Compose hostname `api:5000`.

Set the variable on the web service **before** the image is built:

```text
VITE_API_BASE_URL=https://<public-backend-origin>
```

No trailing slash. Do not commit the real domain in this repository.

Railway injects runtime `PORT`. `nginx.conf.template` is rendered with
`envsubst` (`listen ${PORT}`) at container start.

## PostgreSQL and Redis

Use Railway's private PostgreSQL and Redis services. Do not expose them
publicly.

On FACILIO BACKEND:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

Replace `Postgres` / `Redis` with the actual Railway service names.

FACILIO uses psycopg3. Railway commonly provides `postgresql://...` (and
sometimes `postgres://...`). The API rewrites only those schemes to
`postgresql+psycopg://...`. Existing `postgresql+psycopg://` URLs, SQLite
test URLs, and unrelated schemes are not modified. Credentials are not
logged.

Production (`APP_ENV=production`) requires PostgreSQL and a non-empty
`REDIS_URL`. An in-memory queue is not used in production.

## Backend environment variables

Set these on FACILIO BACKEND (runtime). Generate secrets in Railway; never
commit them.

| Variable | Required | Notes |
| --- | --- | --- |
| `APP_ENV` | yes | `production` |
| `SECRET_KEY` | yes | ≥ 32 characters, not a known placeholder |
| `DATABASE_URL` | yes | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | yes | `${{Redis.REDIS_URL}}` |
| `CORS_ORIGINS` | yes | Public FACILIO WEB origin only. No `*` |
| `UPLOAD_ROOT` | yes | `/app/runtime/uploads` |
| `PORT` | yes | Injected by Railway |
| `LOG_LEVEL` | no | Default `INFO` |
| `JOB_QUEUE_NAME` | no | Default `workflows` |
| `MAX_JOB_ATTEMPTS` | no | Default `3` |
| `JOB_STALE_SECONDS` | no | Default `90` |
| `WORKER_HEARTBEAT_SECONDS` | no | Default `30` |
| `MAX_UPLOAD_SIZE_MB` | no | Default `16` |
| `MAX_CONTENT_LENGTH` | no | Default ~18 MiB |
| `PREVIEW_MAX_ROWS` | no | Default `100` |
| `PREVIEW_MAX_COLUMNS` | no | Default `200` |

Flask debug is forced off. Gunicorn binds `0.0.0.0:$PORT`.

## Web environment variables

| Variable | When | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | **build** | Public backend origin, no trailing slash |
| `PORT` | runtime | Injected by Railway; nginx listens on it |
| `NGINX_ENVSUBST_FILTER` | image | `^PORT$` so nginx `$uri` is not rewritten |

After the backend public domain is known, rebuild the web image so the SPA
picks up `VITE_API_BASE_URL`. Changing the variable at runtime is not
enough.

## Domain and CORS

1. Assign a public domain to FACILIO WEB.
2. Assign a public domain to FACILIO BACKEND.
3. Set web build-time `VITE_API_BASE_URL` to the backend origin.
4. Set backend `CORS_ORIGINS` to the web origin (scheme + host, no path).
5. Rebuild web, redeploy backend.

Do not point the SPA at `localhost` in production.

## Sample data

Try the sample loads `sample-data/facilio-demo-customers.csv` from
`/app/sample-data` inside the backend image. The file is the same synthetic
fixture used in development. It is not fabricated at runtime.

## Local Compose vs Railway

| | Docker Compose | Railway |
| --- | --- | --- |
| API process | `command: ["api"]` | `api-and-worker` |
| Worker process | `command: ["worker"]` | same backend container |
| Shared files | named volume `facilio_uploads` | Railway volume |
| Web → API | `VITE_API_BASE_URL=http://localhost:5050` at image build | public backend origin at image build |
| `PORT` | `5000` on the API container | Railway `PORT` |

`docker compose up --build` must not start two workers. Keep the Compose
command overrides.

## Not in this release

- Object storage
- A separate Railway worker service
- Authentication
- Export
- Public PostgreSQL or Redis
- Vite development server in production
