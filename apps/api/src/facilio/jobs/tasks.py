"""RQ entrypoints. Payloads contain job IDs only."""

from __future__ import annotations


def execute_workflow_job(job_id: str) -> None:
    from facilio.worker.runtime import process_job

    process_job(job_id)
