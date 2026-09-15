# API

Base path: `/api/v1`

All JSON responses follow the Phase 1 contract.

## `GET /api/v1/health`

Reports whether the Flask process is running. Does not probe the database.

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "facilio-api",
    "version": "0.1.0"
  }
}
```

## `GET /api/v1/readiness`

Reports whether required dependencies are usable. Returns HTTP 200 when ready and HTTP 503 when not.

Ready:

```json
{
  "success": true,
  "data": {
    "status": "ready",
    "checks": {
      "database": {
        "status": "ready",
        "message": "Database accepted a connection."
      }
    }
  }
}
```

Not ready:

```json
{
  "success": false,
  "error": {
    "code": "NOT_READY",
    "message": "One or more dependencies are not ready.",
    "details": {
      "status": "not_ready",
      "checks": {
        "database": {
          "status": "not_configured",
          "message": "A database URL has not been configured."
        }
      }
    }
  }
}
```

Database check values: `ready`, `not_configured`, `unavailable`.

When `REDIS_URL` is set, readiness also includes a `queue` check. Redis down makes readiness `not_ready`. An unset `REDIS_URL` is `not_configured` and does not fail readiness (tests and Guided Cleanup).

Worker availability is **not** part of `/health` or `/readiness`. Use `GET /api/v1/operations/health`. CompactHealth is `Limited` when the worker or queue is down.

Invalid collection pagination (`page < 1` or `page_size` outside 1–100) returns HTTP 422.

`POST /api/v1/samples/customers/import` returns 201 when the sample is created and 200 when the existing sample is reused.

`POST /api/v1/workflows/{id}/runs` returns 202 and a Job. It does not execute pandas in the request.
