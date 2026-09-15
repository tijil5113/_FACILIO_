"""Security defaults applied to every HTTP response."""

from __future__ import annotations

from flask import Flask, Response

from facilio.core.config import Settings


def register_security(app: Flask, settings: Settings) -> None:
    overhead = 2 * 1024 * 1024
    app.config["MAX_CONTENT_LENGTH"] = max(
        settings.MAX_CONTENT_LENGTH,
        settings.max_upload_bytes + overhead,
    )
    app.config["SECRET_KEY"] = settings.SECRET_KEY

    @app.after_request
    def apply_security_headers(response: Response) -> Response:
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        response.headers["Cache-Control"] = "no-store"
        return response
