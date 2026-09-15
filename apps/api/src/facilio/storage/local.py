"""Managed source-file storage.

Physical identifiers are generated. Original filenames are metadata only.
This local filesystem backend can later be replaced by object storage without
changing dataset services.
"""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Protocol

SAFE_EXTENSIONS = {"csv", "xlsx", "json"}


class StorageService(Protocol):
    def put(self, data: bytes, *, extension: str) -> str: ...

    def resolve(self, key: str) -> Path: ...

    def delete(self, key: str) -> None: ...

    def exists(self, key: str) -> bool: ...


class LocalStorageService:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def put(self, data: bytes, *, extension: str) -> str:
        suffix = _safe_extension(extension)
        identity = uuid.uuid4()
        directory = self.root / str(identity)
        directory.mkdir(parents=True, exist_ok=False)
        target = directory / f"source.{suffix}"
        target.write_bytes(data)
        return f"{identity}/source.{suffix}"

    def write_key(self, key: str, data: bytes) -> None:
        path = _join_key(self.root, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def delete_prefix(self, prefix: str) -> None:
        path = _join_key(self.root, prefix)
        if path.exists() and path.is_dir() and path != self.root:
            shutil.rmtree(path, ignore_errors=True)
        elif path.exists() and path.is_file():
            path.unlink(missing_ok=True)

    def resolve(self, key: str) -> Path:
        path = _join_key(self.root, key)
        return path

    def delete(self, key: str) -> None:
        path = _join_key(self.root, key)
        directory = path.parent
        if directory.exists() and directory.is_dir() and directory != self.root:
            shutil.rmtree(directory, ignore_errors=True)
        elif path.exists():
            path.unlink(missing_ok=True)

    def exists(self, key: str) -> bool:
        return _join_key(self.root, key).is_file()


def _safe_extension(extension: str) -> str:
    cleaned = extension.lower().lstrip(".")
    if cleaned not in SAFE_EXTENSIONS:
        return "bin"
    return cleaned


def _join_key(root: Path, key: str) -> Path:
    normalized = key.replace("\\", "/").strip("/")
    parts = [part for part in normalized.split("/") if part]
    if not parts or any(part in {".", ".."} for part in parts):
        msg = "Invalid storage key."
        raise ValueError(msg)
    path = (root.joinpath(*parts)).resolve()
    if not path.is_relative_to(root):
        msg = "Invalid storage key."
        raise ValueError(msg)
    return path
