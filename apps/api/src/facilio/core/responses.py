"""Stable JSON response helpers for the FACILIO API contract."""

from __future__ import annotations

from typing import Any

from flask import Response, jsonify


def success_response(data: Any, status_code: int = 200) -> tuple[Response, int]:
    return jsonify({"success": True, "data": data}), status_code


def error_response(
    code: str,
    message: str,
    *,
    status_code: int = 400,
    details: Any = None,
) -> tuple[Response, int]:
    payload: dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
    }
    return jsonify(payload), status_code
