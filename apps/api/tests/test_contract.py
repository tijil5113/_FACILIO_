"""Cross-cutting API contract tests."""

from facilio.core.request_id import REQUEST_ID_HEADER


def test_success_envelope_shape(client) -> None:
    body = client.get("/api/v1/health").get_json()
    assert set(body.keys()) == {"success", "data"}
    assert body["success"] is True


def test_error_envelope_shape(client) -> None:
    body = client.get("/api/v1/missing").get_json()
    assert set(body.keys()) == {"success", "error"}
    assert set(body["error"].keys()) == {"code", "message", "details"}


def test_json_content_type(client) -> None:
    response = client.get("/api/v1/health")
    assert response.content_type.startswith("application/json")
    assert REQUEST_ID_HEADER in response.headers
