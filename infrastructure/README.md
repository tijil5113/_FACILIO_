# Infrastructure

Local infrastructure is defined in the repository-root `docker-compose.yml`.

Services:

- `db` — PostgreSQL 16 with a persistent volume
- `redis` — Redis 7 for RQ dispatch
- `api` — Gunicorn only (`command: ["api"]`, `PORT=5000`)
- `worker` — `python -m facilio.worker` (`command: ["worker"]`)
- `web` — multi-stage Node 22 build served by nginx (SPA fallback, `/health`)

The backend image default is `api-and-worker` for Railway. Compose overrides
that so local API and worker stay in separate containers while sharing
`facilio_uploads`. Do not remove those command overrides or Compose will
run two workers.

The web image requires build-arg `VITE_API_BASE_URL` (Compose default
`http://localhost:5050`). nginx does not proxy `/api` to `api:5000` and
does not run the Vite development server.

Railway production layout, variables, volume mount, and pre-deploy
migrations: [docs/deployment/railway.md](../docs/deployment/railway.md).

Secrets are supplied through environment variables. Do not bake credentials
into images.
