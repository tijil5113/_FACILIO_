#!/bin/sh
# FACILIO backend production entrypoint.
# Supervises Gunicorn + the RQ worker in one container for Railway, or
# runs a single process when Compose overrides the command.
set -eu

SCRIPT_PATH="/app/scripts/docker-entrypoint.sh"
UPLOAD_ROOT="${UPLOAD_ROOT:-/app/runtime/uploads}"
export UPLOAD_ROOT

fail() {
  echo "facilio-entrypoint: $*" >&2
  exit 1
}

require_var() {
  # Intentionally does not print the value (DATABASE_URL / REDIS_URL / SECRET_KEY).
  eval "value=\${$1-}"
  if [ -z "$value" ]; then
    fail "$1 is required"
  fi
}

drop_privileges() {
  if [ "$(id -u)" != "0" ]; then
    return 0
  fi
  if ! command -v gosu >/dev/null 2>&1; then
    fail "gosu is missing; cannot drop root privileges"
  fi
  exec gosu facilio "$SCRIPT_PATH" "$@"
}

prepare_upload_root() {
  mkdir -p "$UPLOAD_ROOT" || fail "could not create UPLOAD_ROOT"
  if [ "$(id -u)" = "0" ]; then
    chown -R facilio:facilio "$UPLOAD_ROOT" || fail "could not chown UPLOAD_ROOT"
  fi
  if [ ! -w "$UPLOAD_ROOT" ]; then
    fail "UPLOAD_ROOT is not writable. On Railway, leave RAILWAY_RUN_UID unset so this entrypoint can chown the volume and drop to uid 1000, or set RAILWAY_RUN_UID=0."
  fi
}

run_api() {
  require_var PORT
  require_var DATABASE_URL
  require_var SECRET_KEY
  echo "facilio-entrypoint: starting gunicorn bind=0.0.0.0:${PORT} workers=2" >&2
  exec gunicorn --bind "0.0.0.0:${PORT}" --workers 2 --timeout 120 facilio.wsgi:app
}

run_worker() {
  require_var DATABASE_URL
  require_var REDIS_URL
  require_var SECRET_KEY
  echo "facilio-entrypoint: starting facilio RQ worker" >&2
  exec python -m facilio.worker
}

shutdown_children() {
  signal="$1"
  trap - TERM INT
  if [ -n "${API_PID:-}" ]; then
    kill "-${signal}" "$API_PID" 2>/dev/null || true
  fi
  if [ -n "${WORKER_PID:-}" ]; then
    kill "-${signal}" "$WORKER_PID" 2>/dev/null || true
  fi
  if [ -n "${API_PID:-}" ]; then
    wait "$API_PID" 2>/dev/null || true
  fi
  if [ -n "${WORKER_PID:-}" ]; then
    wait "$WORKER_PID" 2>/dev/null || true
  fi
}

run_api_and_worker() {
  require_var PORT
  require_var DATABASE_URL
  require_var REDIS_URL
  require_var SECRET_KEY
  echo "facilio-entrypoint: starting gunicorn and RQ worker together bind=0.0.0.0:${PORT}" >&2

  gunicorn --bind "0.0.0.0:${PORT}" --workers 2 --timeout 120 facilio.wsgi:app &
  API_PID=$!
  python -m facilio.worker &
  WORKER_PID=$!

  trap 'shutdown_children TERM; exit 143' TERM
  trap 'shutdown_children INT; exit 130' INT

  while :; do
    if ! kill -0 "$API_PID" 2>/dev/null; then
      status=0
      wait "$API_PID" || status=$?
      echo "facilio-entrypoint: gunicorn exited with ${status}" >&2
      shutdown_children TERM
      exit "$status"
    fi
    if ! kill -0 "$WORKER_PID" 2>/dev/null; then
      status=0
      wait "$WORKER_PID" || status=$?
      echo "facilio-entrypoint: worker exited with ${status}" >&2
      shutdown_children TERM
      exit "$status"
    fi
    sleep 1
  done
}

prepare_upload_root
drop_privileges "$@"

mode="${1:-api-and-worker}"
case "$mode" in
  api-and-worker)
    run_api_and_worker
    ;;
  api)
    run_api
    ;;
  worker)
    run_worker
    ;;
  *)
    exec "$@"
    ;;
esac
