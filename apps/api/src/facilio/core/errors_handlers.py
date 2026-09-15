"""Global Flask error handlers that preserve the API contract."""

from __future__ import annotations

import logging

from flask import Flask
from pydantic import ValidationError
from werkzeug.exceptions import (
    HTTPException,
    MethodNotAllowed,
    NotFound,
    RequestEntityTooLarge,
)

from facilio.core.errors import AppError
from facilio.core.responses import error_response

logger = logging.getLogger("facilio.errors")


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        return error_response(
            error.code,
            error.message,
            status_code=error.status_code,
            details=error.details,
        )

    @app.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError):
        return error_response(
            "VALIDATION_ERROR",
            "The request failed validation.",
            status_code=422,
            details=error.errors(include_url=False, include_context=False),
        )

    @app.errorhandler(NotFound)
    def handle_not_found(_error: NotFound):
        return error_response(
            "NOT_FOUND",
            "The requested resource was not found.",
            status_code=404,
        )

    @app.errorhandler(MethodNotAllowed)
    def handle_method_not_allowed(_error: MethodNotAllowed):
        return error_response(
            "METHOD_NOT_ALLOWED",
            "The HTTP method is not allowed for this resource.",
            status_code=405,
        )

    @app.errorhandler(RequestEntityTooLarge)
    def handle_too_large(_error: RequestEntityTooLarge):
        settings = app.config["FACILIO_SETTINGS"]
        limit = getattr(settings, "MAX_UPLOAD_SIZE_MB", 16)
        return error_response(
            "FILE_TOO_LARGE",
            f"The upload exceeds the allowed limit of {limit} MB.",
            status_code=413,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        message = error.description or "The request could not be processed."
        return error_response(
            "HTTP_ERROR",
            message,
            status_code=error.code or 400,
        )

    @app.errorhandler(400)
    def handle_bad_request(_error: Exception):
        return error_response(
            "BAD_REQUEST",
            "The request was malformed.",
            status_code=400,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        logger.exception("Unhandled application error: %s", error.__class__.__name__)
        return error_response(
            "INTERNAL_ERROR",
            "An unexpected error occurred.",
            status_code=500,
        )
