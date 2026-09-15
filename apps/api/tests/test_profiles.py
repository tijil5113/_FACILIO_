"""Dataset profiling API tests. Isolated temporary storage and SQLite."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pytest

from facilio.app import create_app
from facilio.db.base import Base
from facilio.db.session import Database
from tests.conftest import make_settings


def _upload(client, filename: str, content: bytes):
    return client.post(
        "/api/v1/datasets",
        data={"file": (BytesIO(content), filename)},
        content_type="multipart/form-data",
    )


@pytest.fixture
def client(tmp_path: Path):
    settings = make_settings(
        DATABASE_URL=f"sqlite:///{tmp_path / 'facilio.db'}",
        UPLOAD_ROOT=str(tmp_path / "uploads"),
        MAX_UPLOAD_SIZE_MB=1,
        MAX_CONTENT_LENGTH=3 * 1024 * 1024,
    )
    app = create_app(settings)
    database: Database = app.extensions["database"]
    assert database.engine is not None
    Base.metadata.create_all(database.engine)
    yield app.test_client()
    database.engine.dispose()


def test_profile_not_yet_available(client) -> None:
    created = _upload(client, "a.csv", b"name,city\nAda,Paris\n")
    dataset_id = created.get_json()["data"]["id"]
    response = client.get(f"/api/v1/datasets/{dataset_id}/profile")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "PROFILE_NOT_FOUND"
    assert created.get_json()["data"]["profile_status"] == "NOT_PROFILED"


def test_profile_dataset_and_persist(client) -> None:
    csv = (
        b"name,email,status\n"
        b"Ada,ada@example.test,active\n"
        b"Ada,ada@example.test,active\n"
        b"Alan,,Active\n"
    )
    created = _upload(client, "customers.csv", csv)
    dataset_id = created.get_json()["data"]["id"]
    request_id = created.headers.get("X-Request-ID")
    assert request_id

    response = client.post(f"/api/v1/datasets/{dataset_id}/profile")
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID")
    body = response.get_json()
    assert body["success"] is True
    data = body["data"]
    assert data["status"] == "READY"
    assert data["profile_version"] == "1.0"
    assert data["summary"]["row_count"] == 3
    assert data["summary"]["duplicate_rows"] == 1
    assert data["quality"]["overall_status"] in {"ASSESSED", "NOT_ASSESSED"}
    assert data["quality"]["dimensions"]
    integrity = next(
        item for item in data["quality"]["dimensions"] if item["key"] == "INTEGRITY"
    )
    assert integrity["status"] == "NOT_ASSESSED"
    assert integrity["score"] is None

    again = client.get(f"/api/v1/datasets/{dataset_id}/profile")
    assert again.status_code == 200
    assert again.get_json()["data"]["summary"]["duplicate_rows"] == 1

    quality = client.get(f"/api/v1/datasets/{dataset_id}/quality")
    assert quality.status_code == 200
    assert quality.get_json()["data"]["weighting"]
    detail = client.get(f"/api/v1/datasets/{dataset_id}").get_json()["data"]
    version_id = detail["current_version_id"]
    quality_versioned = client.get(
        f"/api/v1/datasets/{dataset_id}/quality?version={version_id}"
    )
    assert quality_versioned.status_code == 200
    assert quality_versioned.get_json()["data"]["weighting"]

    issues = client.get(f"/api/v1/datasets/{dataset_id}/issues")
    assert issues.status_code == 200
    payload = issues.get_json()["data"]
    assert payload["total"] >= 1
    codes = {item["code"] for item in payload["items"]}
    assert "DUPLICATE_ROWS" in codes

    filtered = client.get(
        f"/api/v1/datasets/{dataset_id}/issues?severity=INFO&page=1&page_size=5"
    )
    assert filtered.status_code == 200
    for item in filtered.get_json()["data"]["items"]:
        assert item["severity"] == "INFO"

    listed = client.get("/api/v1/datasets")
    item = listed.get_json()["data"]["items"][0]
    assert item["profile_status"] == "READY"
    assert "quality_score" in item


def test_reprofile_replaces_current(client) -> None:
    created = _upload(client, "a.csv", b"n\n1\n1\n")
    dataset_id = created.get_json()["data"]["id"]
    first = client.post(f"/api/v1/datasets/{dataset_id}/profile")
    second = client.post(f"/api/v1/datasets/{dataset_id}/profile")
    assert first.status_code == 200
    assert second.status_code == 200
    listed = client.get("/api/v1/datasets")
    assert listed.get_json()["data"]["total"] == 1
    overview = client.get("/api/v1/quality/summary")
    assert overview.status_code == 200
    data = overview.get_json()["data"]
    assert data["datasets_profiled"] == 1
    assert data["datasets_not_profiled"] == 0


def test_profile_missing_dataset(client) -> None:
    response = client.post(
        "/api/v1/datasets/00000000-0000-4000-8000-000000000000/profile"
    )
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "DATASET_NOT_FOUND"


def test_profile_failure_preserves_dataset(client, tmp_path: Path) -> None:
    created = _upload(client, "a.csv", b"name\nAda\n")
    dataset_id = created.get_json()["data"]["id"]
    uploads = tmp_path / "uploads"
    for path in uploads.rglob("source.csv"):
        path.unlink()
    response = client.post(f"/api/v1/datasets/{dataset_id}/profile")
    assert response.status_code == 500
    error_code = response.get_json()["error"]["code"]
    assert error_code in {"PROFILING_FAILED", "INGESTION_FAILED"}
    detail = client.get(f"/api/v1/datasets/{dataset_id}")
    assert detail.status_code == 200
    assert detail.get_json()["data"]["status"] == "ready"
    preview = client.get(f"/api/v1/datasets/{dataset_id}/preview")
    assert preview.status_code == 500


def test_unprofiled_quality_overview(client) -> None:
    _upload(client, "a.csv", b"name\nAda\n")
    response = client.get("/api/v1/quality/summary")
    data = response.get_json()["data"]
    assert data["datasets_total"] == 1
    assert data["datasets_profiled"] == 0
    assert data["average_quality"] is None
    assert data["datasets_not_profiled"] == 1
