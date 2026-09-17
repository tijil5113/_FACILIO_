FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FLASK_DEBUG=0 \
    UPLOAD_ROOT=/app/runtime/uploads

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && adduser --disabled-password --gecos "" --uid 1000 facilio \
    && gosu facilio true

COPY packages/processing /opt/processing
COPY apps/api/pyproject.toml ./
COPY apps/api/README.md ./
COPY apps/api/src ./src
COPY apps/api/migrations ./migrations
COPY apps/api/alembic.ini ./
COPY apps/api/scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
COPY sample-data /app/sample-data

RUN pip install --no-cache-dir /opt/processing \
    && pip install --no-cache-dir . \
    && chmod 755 /app/scripts/docker-entrypoint.sh \
    && mkdir -p /app/runtime/uploads \
    && chown -R facilio:facilio /app /app/sample-data

# Remain root so a Railway volume mounted at UPLOAD_ROOT can be chowned,
# then the entrypoint drops to uid 1000 before Gunicorn and the worker start.

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/v1/health' % os.environ['PORT'], timeout=3)"

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["api-and-worker"]
