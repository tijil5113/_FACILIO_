"""API error contract tests."""

from pydantic import BaseModel, ValidationError

from facilio.core.errors import AppError


def test_404_uses_error_contract(client) -> None:
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    body = response.get_json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"
    assert "message" in body["error"]
    assert "details" in body["error"]


def test_405_uses_error_contract(client) -> None:
    response = client.post("/api/v1/health")
    assert response.status_code == 405
    body = response.get_json()
    assert body["success"] is False
    assert body["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_expected_app_error(app) -> None:
    @app.get("/api/v1/__test_app_error")
    def raise_expected():
        raise AppError("TEST_ERROR", "An expected failure.", status_code=409)

    response = app.test_client().get("/api/v1/__test_app_error")
    assert response.status_code == 409
    body = response.get_json()
    assert body["success"] is False
    assert body["error"]["code"] == "TEST_ERROR"
    assert body["error"]["message"] == "An expected failure."


def test_validation_error(app) -> None:
    class Payload(BaseModel):
        count: int

    @app.get("/api/v1/__test_validation")
    def raise_validation():
        try:
            Payload.model_validate({"count": "nope"})
        except ValidationError:
            raise

    response = app.test_client().get("/api/v1/__test_validation")
    assert response.status_code == 422
    body = response.get_json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["details"]


def test_unexpected_error_does_not_leak_internals(app) -> None:
    @app.get("/api/v1/__test_boom")
    def boom():
        raise RuntimeError("secret internals must not leak")

    response = app.test_client().get("/api/v1/__test_boom")
    assert response.status_code == 500
    body = response.get_json()
    assert body["success"] is False
    assert body["error"]["code"] == "INTERNAL_ERROR"
    text = response.get_data(as_text=True)
    assert "secret internals" not in text
    assert "Traceback" not in text
