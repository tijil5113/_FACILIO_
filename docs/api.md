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
