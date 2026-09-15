"""Request correlation identifiers."""

from __future__ import annotations

import re
import uuid
from contextvars import ContextVar

from flask import Flask, g, request

REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,128}$")

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    try:
        stored = getattr(g, "request_id", None)
    except RuntimeError:
        stored = None
    if isinstance(stored, str):
        return stored
    return request_id_ctx.get()


def normalize_request_id(raw: str | None) -> str:
    if raw and _REQUEST_ID_PATTERN.fullmatch(raw):
        return raw
    return str(uuid.uuid4())


def register_request_id(app: Flask) -> None:
    @app.before_request
    def assign_request_id() -> None:
        incoming = request.headers.get(REQUEST_ID_HEADER)
        request_id = normalize_request_id(incoming)
        g.request_id = request_id
        request_id_ctx.set(request_id)

    @app.after_request
    def expose_request_id(response):  # type: ignore[no-untyped-def]
        request_id = get_request_id()
        if request_id:
            response.headers[REQUEST_ID_HEADER] = request_id
        return response
