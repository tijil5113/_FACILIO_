"""WSGI entrypoint for production servers."""

from facilio.app import create_app

app = create_app()
