"""Health and readiness response schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthData(BaseModel):
    status: Literal["healthy"]
    service: str
    version: str


class CheckResult(BaseModel):
    status: Literal["ready", "not_configured", "unavailable"]
    message: str


class ReadinessData(BaseModel):
    status: Literal["ready", "not_ready"]
    checks: dict[str, CheckResult] = Field(default_factory=dict)
