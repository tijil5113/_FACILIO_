# Infrastructure

Local infrastructure is defined in the repository-root `docker-compose.yml`.

Services:

- `db` — PostgreSQL 16 with a persistent volume
- `redis` — Redis 7 for RQ dispatch
- `api` — Gunicorn Flask application
- `worker` — `python -m facilio.worker` (same image as API, same `DATABASE_URL` / `REDIS_URL`)
- `web` — multi-stage Node 22 build served by nginx (SPA fallback, `/api` proxied to the API)

The web image does not run the Vite development server.

Secrets are supplied through environment variables. Do not bake credentials into images.

