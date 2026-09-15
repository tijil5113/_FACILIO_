# Infrastructure

Phase 1 local infrastructure is defined in the repository-root `docker-compose.yml`.

Services:

- `db` — PostgreSQL 16 with a persistent volume
- `redis` — Redis 7 for RQ dispatch
- `api` — Flask application
- `worker` — `python -m facilio.worker` (same image as API)
- `web` — Vite development frontend

Secrets are supplied through environment variables. Do not bake credentials into images.
