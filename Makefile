PYTHON ?= python3.12
API_DIR := apps/api
WEB_DIR := apps/web
PROC_DIR := packages/processing
API_VENV := $(API_DIR)/.venv
PROC_VENV := $(PROC_DIR)/.venv

.PHONY: help install install-api install-web install-processing \
	dev-api dev-web dev-worker test test-api test-web test-processing \
	lint lint-api lint-web format format-api format-web \
	typecheck build-web

help:
	@echo "FACILIO development commands"
	@echo ""
	@echo "  make install           Install API, processing, and web dependencies"
	@echo "  make dev-api           Run the Flask API on http://127.0.0.1:5050"
	@echo "  make dev-worker        Run the RQ worker (requires REDIS_URL)"
	@echo "  make dev-web           Run the Vite frontend on http://127.0.0.1:5173"
	@echo "  make test              Run backend, processing, and frontend tests"
	@echo "  make lint              Lint backend and frontend"
	@echo "  make format            Format backend and frontend"
	@echo "  make typecheck         Type-check the frontend"
	@echo "  make build-web         Production frontend build"

install: install-api install-processing install-web

install-api:
	$(PYTHON) -m venv $(API_VENV)
	$(API_VENV)/bin/pip install --upgrade pip
	$(API_VENV)/bin/pip install -e "$(PROC_DIR)"
	$(API_VENV)/bin/pip install -e "$(API_DIR)[dev]"

install-processing:
	$(PYTHON) -m venv $(PROC_VENV)
	$(PROC_VENV)/bin/pip install --upgrade pip
	$(PROC_VENV)/bin/pip install -e "$(PROC_DIR)[dev]"

install-web:
	cd $(WEB_DIR) && npm install

dev-api:
	cd $(API_DIR) && FLASK_SKIP_DOTENV=1 .venv/bin/flask --app facilio.app:create_app run --debug --port 5050

dev-worker:
	cd $(API_DIR) && FLASK_SKIP_DOTENV=1 .venv/bin/python -m facilio.worker

dev-web:
	cd $(WEB_DIR) && npm run dev

test: test-api test-processing test-web

test-api:
	cd $(API_DIR) && .venv/bin/ruff format --check src tests
	cd $(API_DIR) && .venv/bin/ruff check src tests
	cd $(API_DIR) && .venv/bin/pytest

test-processing:
	cd $(PROC_DIR) && .venv/bin/pytest

test-web:
	cd $(WEB_DIR) && npm run lint
	cd $(WEB_DIR) && npm run format:check
	cd $(WEB_DIR) && npm run typecheck
	cd $(WEB_DIR) && npm run test
	cd $(WEB_DIR) && npm run build

lint: lint-api lint-web

lint-api:
	cd $(API_DIR) && .venv/bin/ruff check src tests

lint-web:
	cd $(WEB_DIR) && npm run lint

format: format-api format-web

format-api:
	cd $(API_DIR) && .venv/bin/ruff format src tests
	cd $(API_DIR) && .venv/bin/ruff check --fix src tests

format-web:
	cd $(WEB_DIR) && npm run format

typecheck:
	cd $(WEB_DIR) && npm run typecheck

build-web:
	cd $(WEB_DIR) && npm run build
