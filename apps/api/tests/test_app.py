"""Application factory tests."""

from facilio.app import create_app
from facilio.core.config import Settings
from tests.conftest import make_settings


def test_create_app_returns_flask_application() -> None:
    app = create_app(make_settings())
    assert app.name == "facilio"
    assert "database" in app.extensions
    assert app.config["FACILIO_SETTINGS"].APP_ENV == "testing"


def test_root_service_index(client) -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["data"]["health"] == "/api/v1/health"
    assert body["data"]["readiness"] == "/api/v1/readiness"


def test_create_app_disables_flask_debug(client) -> None:
    assert client.application.config["DEBUG"] is False
    assert client.application.debug is False


def test_create_app_accepts_explicit_settings() -> None:
    settings = Settings.model_validate(
        {
            "APP_ENV": "testing",
            "SECRET_KEY": "another-test-secret-key",
            "DATABASE_URL": "",
            "CORS_ORIGINS": "http://localhost:5173",
            "LOG_LEVEL": "ERROR",
        }
    )
    app = create_app(settings)
    assert app.config["FACILIO_SETTINGS"].LOG_LEVEL == "ERROR"
