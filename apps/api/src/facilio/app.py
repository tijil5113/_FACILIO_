"""Flask application factory."""

from __future__ import annotations

from flask import Flask, request
from flask_cors import CORS

from facilio.api.v1 import v1_bp
from facilio.core.config import Settings, get_settings
from facilio.core.errors_handlers import register_error_handlers
from facilio.core.logging import configure_logging, get_logger
from facilio.core.request_id import register_request_id
from facilio.core.responses import success_response
from facilio.core.security import register_security
from facilio.db.session import Database
from facilio.jobs.queue import build_queue

logger = get_logger("facilio.app")


def create_app(settings: Settings | None = None) -> Flask:
    resolved = settings or get_settings()
    configure_logging(resolved)

    app = Flask("facilio")
    app.config["FACILIO_SETTINGS"] = resolved
    app.url_map.strict_slashes = False

    register_security(app, resolved)
    register_request_id(app)
    register_error_handlers(app)
    _register_cors(app, resolved)
    _register_database(app, resolved)
    _register_queue(app, resolved)
    _register_blueprints(app)
    _register_request_logging(app)

    logger.info(
        "FACILIO API initialized (env=%s, version=%s)",
        resolved.APP_ENV,
        resolved.APP_VERSION,
    )
    return app


def _register_cors(app: Flask, settings: Settings) -> None:
    CORS(
        app,
        resources={r"/api/*": {"origins": settings.cors_origin_list()}},
        supports_credentials=False,
        expose_headers=["X-Request-ID"],
        allow_headers=["Content-Type", "X-Request-ID"],
    )


def _register_database(app: Flask, settings: Settings) -> None:
    app.extensions["database"] = Database(settings)


def _register_queue(app: Flask, settings: Settings) -> None:
    app.extensions["job_queue"] = build_queue(settings)


def _register_blueprints(app: Flask) -> None:
    app.register_blueprint(v1_bp, url_prefix="/api/v1")

    @app.get("/")
    def root():
        return success_response(
            {
                "service": "facilio-api",
                "version": app.config["FACILIO_SETTINGS"].APP_VERSION,
                "health": "/api/v1/health",
                "readiness": "/api/v1/readiness",
            }
        )


def _register_request_logging(app: Flask) -> None:
    @app.after_request
    def log_request(response):
        logger.info(
            "%s %s %s",
            request.method,
            request.path,
            response.status_code,
        )
        return response
