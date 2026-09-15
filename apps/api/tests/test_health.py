"""Health endpoint tests."""

from facilio import __version__


def test_health_returns_contract(client) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body == {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "facilio-api",
            "version": __version__,
        },
    }


def test_health_does_not_import_pandas(client) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert "pandas" not in response.get_data(as_text=True)


def test_health_exposes_security_headers(client) -> None:
    response = client.get("/api/v1/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Cache-Control"] == "no-store"
