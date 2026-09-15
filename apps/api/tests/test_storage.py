"""Local storage safety tests."""

from pathlib import Path

import pytest

from facilio.storage.local import LocalStorageService


def test_put_uses_generated_identifier(tmp_path: Path) -> None:
    storage = LocalStorageService(tmp_path)
    key = storage.put(b"abc", extension="csv")
    assert ".." not in key
    assert key.endswith("/source.csv")
    assert not key.startswith("customers")
    assert storage.resolve(key).read_bytes() == b"abc"


def test_collision_safe_put(tmp_path: Path) -> None:
    storage = LocalStorageService(tmp_path)
    first = storage.put(b"one", extension="csv")
    second = storage.put(b"one", extension="csv")
    assert first != second
    assert storage.resolve(first).read_bytes() == b"one"
    assert storage.resolve(second).read_bytes() == b"one"


def test_rejects_path_escape(tmp_path: Path) -> None:
    storage = LocalStorageService(tmp_path)
    with pytest.raises(ValueError):
        storage.resolve("../secret.csv")
    with pytest.raises(ValueError):
        storage.resolve("ok/../../secret.csv")


def test_delete_missing_is_safe(tmp_path: Path) -> None:
    storage = LocalStorageService(tmp_path)
    key = storage.put(b"x", extension="json")
    storage.delete(key)
    storage.delete(key)
    assert storage.exists(key) is False
