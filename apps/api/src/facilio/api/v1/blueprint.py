"""API v1 blueprint assembly."""

from flask import Blueprint

from facilio.api.v1 import (
    cleanup,
    datasets,
    health,
    jobs,
    quality,
    samples,
    transformations,
    workflows,
)

v1_bp = Blueprint("api_v1", __name__)
health.register(v1_bp)
datasets.register(v1_bp)
samples.register(v1_bp)
quality.register(v1_bp)
transformations.register(v1_bp)
cleanup.register(v1_bp)
workflows.register(v1_bp)
jobs.register(v1_bp)
