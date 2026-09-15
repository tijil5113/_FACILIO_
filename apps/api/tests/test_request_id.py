"""Request correlation identifier tests."""

from facilio.core.request_id import REQUEST_ID_HEADER, normalize_request_id


def test_generated_request_id_is_returned(client) -> None:
    response = client.get("/api/v1/health")
    request_id = response.headers.get(REQUEST_ID_HEADER)
    assert request_id
    assert len(request_id) >= 8


def test_incoming_request_id_is_echoed(client) -> None:
    response = client.get(
        "/api/v1/health", headers={REQUEST_ID_HEADER: "trace-abc-123"}
    )
    assert response.headers[REQUEST_ID_HEADER] == "trace-abc-123"


def test_invalid_request_id_is_replaced(client) -> None:
    response = client.get(
        "/api/v1/health",
        headers={REQUEST_ID_HEADER: "not a valid id !!!"},
    )
    assert response.headers[REQUEST_ID_HEADER] != "not a valid id !!!"


def test_normalize_request_id_rejects_oversized_values() -> None:
    generated = normalize_request_id("a" * 200)
    assert generated != "a" * 200
    assert len(generated) < 200
