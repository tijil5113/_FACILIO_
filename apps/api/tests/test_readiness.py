"""Readiness endpoint tests."""

from facilio.app import create_app
from tests.conftest import make_settings


def test_readiness_ready_with_sqlite(client) -> None:
    response = client.get("/api/v1/readiness")
    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["data"]["status"] == "ready"
    assert body["data"]["checks"]["database"]["status"] == "ready"


def test_readiness_not_configured() -> None:
    app = create_app(make_settings(DATABASE_URL=""))
    client = app.test_client()
    response = client.get("/api/v1/readiness")
    assert response.status_code == 503
    body = response.get_json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_READY"
    assert body["error"]["details"]["checks"]["database"]["status"] == "not_configured"
    assert "password" not in response.get_data(as_text=True).lower()


def test_readiness_unavailable() -> None:
    app = create_app(
        make_settings(
            DATABASE_URL="postgresql+psycopg://facilio:invalid@127.0.0.1:1/facilio"
        )
    )
    client = app.test_client()
    response = client.get("/api/v1/readiness")
    assert response.status_code == 503
    body = response.get_json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_READY"
    assert body["error"]["details"]["checks"]["database"]["status"] == "unavailable"
    text = response.get_data(as_text=True).lower()
    assert "invalid" not in text
    assert "traceback" not in text
