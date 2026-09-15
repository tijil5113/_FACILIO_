"""Filename helpers for untrusted uploads."""

from __future__ import annotations

from pathlib import Path


def original_filename(raw: str | None) -> str:
    if not raw:
        return "upload"
    name = Path(raw.replace("\\", "/")).name
    if not name or name in {".", ".."}:
        return "upload"
    return name[:512]


def display_stem(filename: str) -> str:
    stem = Path(filename).stem.strip()
    return stem[:200] if stem else "dataset"
