"""Dataset API tests. Uploads use isolated temporary storage."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

import pytest
from openpyxl import Workbook

from facilio.app import create_app
from facilio.db.base import Base
from facilio.db.session import Database
from tests.conftest import make_settings


def _xlsx_bytes(sheets: dict[str, list[list[object]]]) -> bytes:
    workbook = Workbook()
    default = workbook.active
    first = True
    for name, rows in sheets.items():
        worksheet = default if first else workbook.create_sheet(title=name)
        if first:
            worksheet.title = name
            first = False
        for row in rows:
            worksheet.append(row)
    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _upload(client, filename: str, content: bytes, **form):
    data = {"file": (BytesIO(content), filename), **form}
    return client.post(
        "/api/v1/datasets",
        data=data,
        content_type="multipart/form-data",
    )


@pytest.fixture
def dataset_env(tmp_path: Path):
    settings = make_settings(
        DATABASE_URL=f"sqlite:///{tmp_path / 'facilio.db'}",
        UPLOAD_ROOT=str(tmp_path / "uploads"),
        MAX_UPLOAD_SIZE_MB=1,
        MAX_CONTENT_LENGTH=3 * 1024 * 1024,
        PREVIEW_MAX_ROWS=5,
        PREVIEW_MAX_COLUMNS=10,
    )
    app = create_app(settings)
    database: Database = app.extensions["database"]
    assert database.engine is not None
    Base.metadata.create_all(database.engine)
    yield app, tmp_path / "uploads"
    database.engine.dispose()


@pytest.fixture
def client(dataset_env):
    app, _uploads = dataset_env
    return app.test_client()


def test_create_csv_dataset(client) -> None:
    response = _upload(client, "customers.csv", b"name,city\nAda,Paris\n")
    assert response.status_code == 201
    body = response.get_json()
    assert body["success"] is True
    data = body["data"]
    assert data["status"] == "ready"
    assert data["file_type"] == "csv"
    assert data["row_count"] == 1
    assert data["column_count"] == 2
    assert data["original_filename"] == "customers.csv"
    assert "storage_key" not in data
    assert data["columns"][0]["name"] == "name"


def test_create_json_dataset(client) -> None:
    payload = b'[{"sku":"A","price":1.5},{"sku":"B","price":null}]'
    response = _upload(client, "products.json", payload)
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["file_type"] == "json"
    assert data["row_count"] == 2


def test_create_xlsx_single_sheet(client) -> None:
    content = _xlsx_bytes({"Inventory": [["sku", "qty"], ["A", 3]]})
    response = _upload(client, "inventory.xlsx", content)
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["file_type"] == "xlsx"
    assert data["selected_sheet"] == "Inventory"


def test_xlsx_sheet_selection(client) -> None:
    content = _xlsx_bytes(
        {
            "Customers": [["name"], ["Ada"]],
            "Orders": [["id"], [1]],
        }
    )
    response = _upload(client, "ops.xlsx", content)
    assert response.status_code == 409
    error = response.get_json()["error"]
    assert error["code"] == "SHEET_SELECTION_REQUIRED"
    staging_id = error["details"]["staging_id"]
    sheets = {item["name"] for item in error["details"]["sheets"]}
    assert sheets == {"Customers", "Orders"}

    complete = client.post(
        "/api/v1/datasets",
        data={"staging_id": staging_id, "sheet": "Orders"},
        content_type="multipart/form-data",
    )
    assert complete.status_code == 201
    data = complete.get_json()["data"]
    assert data["selected_sheet"] == "Orders"
    assert data["row_count"] == 1


def test_unsupported_extension(client) -> None:
    response = _upload(client, "notes.txt", b"hello")
    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_empty_upload(client) -> None:
    response = _upload(client, "empty.csv", b"")
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "EMPTY_FILE"


def test_oversized_upload(client) -> None:
    payload = b"a" * (1024 * 1024 + 8)
    response = _upload(client, "big.csv", b"name\n" + payload)
    assert response.status_code == 413
    error = response.get_json()["error"]
    assert error["code"] == "FILE_TOO_LARGE"
    assert "1 MB" in error["message"]


def test_malformed_json(client) -> None:
    response = _upload(client, "bad.json", b"{not json")
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "INVALID_JSON"


def test_non_tabular_json(client) -> None:
    response = _upload(client, "list.json", b'["a","b"]')
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "NON_TABULAR_JSON"


def test_duplicate_filename_does_not_overwrite(client, dataset_env) -> None:
    first = _upload(client, "customers.csv", b"name\nAda\n")
    second = _upload(client, "customers.csv", b"name\nBob\n")
    assert first.status_code == 201
    assert second.status_code == 201
    one = first.get_json()["data"]
    two = second.get_json()["data"]
    assert one["id"] != two["id"]
    assert one["name"] == "customers"
    assert two["name"] == "customers (2)"
    uploads = dataset_env[1]
    stored = list(uploads.glob("*/source.csv"))
    assert len(stored) == 2
    contents = {path.read_bytes() for path in stored}
    assert contents == {b"name\nAda\n", b"name\nBob\n"}


def test_list_and_pagination(client) -> None:
    _upload(client, "a.csv", b"n\n1\n")
    _upload(client, "b.csv", b"n\n2\n")
    _upload(client, "c.csv", b"n\n3\n")
    page = client.get("/api/v1/datasets?page=1&page_size=2")
    body = page.get_json()["data"]
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["page_size"] == 2
    assert len(body["items"]) == 2
    assert body["max_upload_size_mb"] == 1
    page2 = client.get("/api/v1/datasets?page=2&page_size=2")
    assert len(page2.get_json()["data"]["items"]) == 1


def test_get_dataset_and_missing(client) -> None:
    created = _upload(client, "a.csv", b"n\n1\n").get_json()["data"]
    found = client.get(f"/api/v1/datasets/{created['id']}")
    assert found.status_code == 200
    assert found.get_json()["data"]["id"] == created["id"]
    missing = client.get("/api/v1/datasets/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404
    assert missing.get_json()["error"]["code"] == "DATASET_NOT_FOUND"
    invalid = client.get("/api/v1/datasets/not-a-uuid")
    assert invalid.status_code == 404


def test_preview_json_safe_nulls(client) -> None:
    response = _upload(client, "nulls.csv", b"name,city\nAda,\n")
    dataset_id = response.get_json()["data"]["id"]
    preview = client.get(f"/api/v1/datasets/{dataset_id}/preview")
    assert preview.status_code == 200
    data = preview.get_json()["data"]
    assert data["rows"][0][1] is None
    assert data["preview_row_count"] == 1
    assert data["truncated_rows"] is False


def test_rename_and_invalid_rename(client) -> None:
    created = _upload(client, "a.csv", b"n\n1\n").get_json()["data"]
    renamed = client.patch(
        f"/api/v1/datasets/{created['id']}",
        json={"name": "  Revenue  "},
    )
    assert renamed.status_code == 200
    assert renamed.get_json()["data"]["name"] == "Revenue"
    assert renamed.get_json()["data"]["original_filename"] == "a.csv"
    invalid = client.patch(
        f"/api/v1/datasets/{created['id']}",
        json={"name": "   "},
    )
    assert invalid.status_code == 422


def test_delete_removes_file(client, dataset_env) -> None:
    created = _upload(client, "a.csv", b"n\n1\n").get_json()["data"]
    uploads = dataset_env[1]
    assert list(uploads.glob("*/source.csv"))
    deleted = client.delete(f"/api/v1/datasets/{created['id']}")
    assert deleted.status_code == 200
    assert deleted.get_json()["data"]["deleted"] is True
    assert list(uploads.glob("*/source.csv")) == []
    missing = client.get(f"/api/v1/datasets/{created['id']}")
    assert missing.status_code == 404


def test_malformed_xlsx(client) -> None:
    response = _upload(client, "bad.xlsx", b"not-zip")
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "INVALID_WORKBOOK"


def test_zip_masquerading_as_xlsx(client) -> None:
    buffer = BytesIO()
    with ZipFile(buffer, "w") as archive:
        archive.writestr("readme.txt", "nope")
    response = _upload(client, "notes.xlsx", buffer.getvalue())
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "INVALID_WORKBOOK"


def test_failed_persist_cleans_storage(client, dataset_env, monkeypatch) -> None:
    from facilio.repositories.dataset import DatasetRepository

    def boom(self, dataset):
        raise RuntimeError("persist failed")

    monkeypatch.setattr(DatasetRepository, "add", boom)
    response = _upload(client, "a.csv", b"n\n1\n")
    assert response.status_code == 500
    uploads = dataset_env[1]
    assert list(uploads.glob("*/source.csv")) == []


def test_request_contract_on_dataset_error(client) -> None:
    response = _upload(client, "x.pdf", b"%PDF-1.4")
    body = response.get_json()
    assert set(body.keys()) == {"success", "error"}
    assert set(body["error"].keys()) == {"code", "message", "details"}
    assert "X-Request-ID" in response.headers


def test_failed_persist_cleans_derived(client, dataset_env, monkeypatch) -> None:
    from facilio.repositories.version import VersionRepository

    created = _upload(client, "a.csv", b"name\n Ada \n").get_json()["data"]
    dataset_id = created["id"]
    version_id = created["current_version_id"]

    def boom(self, version):
        raise RuntimeError("persist failed")

    monkeypatch.setattr(VersionRepository, "add", boom)
    response = client.post(
        f"/api/v1/datasets/{dataset_id}/versions/{version_id}/transformations",
        json={"operation": "TRIM_WHITESPACE", "parameters": {"column": "name"}},
    )
    assert response.status_code == 500
    uploads = dataset_env[1]
    assert list(uploads.rglob("data.ftable.json")) == []
    original = next(uploads.glob("*/source.csv"))
    assert original.read_bytes() == b"name\n Ada \n"


def test_source_bytes_unmodified(client, dataset_env) -> None:
    original = b"name,city\nAda,NA\n"
    created = _upload(client, "a.csv", original).get_json()["data"]
    stored = next((dataset_env[1]).glob("*/source.csv"))
    assert stored.read_bytes() == original
    preview = client.get(f"/api/v1/datasets/{created['id']}/preview").get_json()["data"]
    assert preview["rows"][0][1] == "NA"
