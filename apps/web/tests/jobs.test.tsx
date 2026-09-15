import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import {
  emptyDatasetList,
  emptyQualityOverview,
  emptyWorkspaceStats,
  jsonResponse,
  pathnameOf,
  requestUrl,
} from "./helpers";
import type { JobDetail, JobSummary } from "@/types/jobs";

const now = "2026-09-11T16:00:00.000Z";

function jobSummary(overrides: Partial<JobSummary> = {}): JobSummary {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    job_type: "WORKFLOW_RUN",
    status: "RUNNING",
    workflow_run_id: "22222222-2222-4222-8222-222222222222",
    workflow_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workflow_name: "Customer Data Cleanup",
    dataset_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    dataset_name: "customers.csv",
    input_version_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    input_version_number: 1,
    output_version_id: null,
    output_version_number: null,
    queue_name: "workflows",
    attempt_count: 1,
    max_attempts: 3,
    progress: { current: 2, total: 4, label: "2 of 4 steps complete" },
    current_step_position: 1,
    current_operation_code: "NORMALIZE_CASE",
    current_activity: "Executing step 2 of 4",
    queued_at: now,
    started_at: now,
    completed_at: null,
    heartbeat_at: now,
    queue_ms: 12,
    execution_ms: null,
    total_ms: null,
    error_code: null,
    error_message_safe: null,
    error_category: null,
    retryable: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function mockJobsApi(job: JobSummary = jobSummary()) {
  const state = { status: job.status };
  const detail = (): JobDetail => ({
    ...job,
    status: state.status,
    current_activity:
      state.status === "CANCEL_REQUESTED"
        ? "Cancellation requested. The current step will finish before execution stops."
        : job.current_activity,
    request_id: "req-1",
    cancel_requested_at: state.status === "CANCEL_REQUESTED" ? now : null,
    cancelled_at: null,
    attempts: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        job_id: job.id,
        attempt_number: 1,
        status: state.status,
        worker_id: "host:1",
        started_at: now,
        completed_at: null,
        duration_ms: null,
        error_code: null,
        error_message_safe: null,
        error_category: null,
      },
    ],
    step_runs: [
      {
        id: "44444444-4444-4444-8444-444444444441",
        workflow_run_id: job.workflow_run_id,
        workflow_step_id: null,
        position: 0,
        operation_code: "TRIM_WHITESPACE",
        status: "SUCCEEDED",
        duration_ms: 18,
        rows_before: 3,
        rows_after: 3,
        columns_before: 4,
        columns_after: 4,
        changed_cells: 2,
        removed_rows: 0,
        removed_columns: 0,
        warning_summary: null,
        error_code: null,
        error_message_safe: null,
        step_snapshot: {},
      },
      {
        id: "44444444-4444-4444-8444-444444444442",
        workflow_run_id: job.workflow_run_id,
        workflow_step_id: null,
        position: 1,
        operation_code: "NORMALIZE_CASE",
        status: "RUNNING",
        duration_ms: null,
        rows_before: null,
        rows_after: null,
        columns_before: null,
        columns_after: null,
        changed_cells: null,
        removed_rows: null,
        removed_columns: null,
        warning_summary: null,
        error_code: null,
        error_message_safe: null,
        step_snapshot: {},
      },
    ],
    workflow_revision: 5,
    workflow_run_status: state.status === "CANCEL_REQUESTED" ? "RUNNING" : job.status,
    quality_before: 78.4,
    quality_after: null,
    rows_before: 3,
    rows_after: null,
  });
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const path = pathnameOf(url);
    const method = (
      init?.method ??
      (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    if (path === "/api/v1/health" || path.endsWith("/api/v1/health")) {
      return jsonResponse({
        success: true,
        data: { status: "healthy", service: "facilio-api", version: "0.1.0" },
      });
    }
    if (path === "/api/v1/readiness" || path.endsWith("/api/v1/readiness")) {
      return jsonResponse({
        success: true,
        data: {
          status: "ready",
          checks: {
            database: { status: "ready", message: "ok" },
            queue: { status: "ready", message: "ok" },
          },
        },
      });
    }
    if (path === "/api/v1/workspace/summary") {
      return jsonResponse({ success: true, data: emptyWorkspaceStats });
    }
    if (path === "/api/v1/quality/summary") {
      return jsonResponse({ success: true, data: emptyQualityOverview });
    }
    if (path === "/api/v1/datasets") {
      return jsonResponse({ success: true, data: emptyDatasetList });
    }
    if (path === "/api/v1/operations/health") {
      return jsonResponse({
        success: true,
        data: {
          queue: {
            status: "ready",
            backend: "redis",
            queued_count: 1,
            name: "workflows",
          },
          worker: { status: "available", available_count: 1, last_seen_at: now },
          jobs: { queued: 0, running: 1, failed: 0, succeeded: 0 },
        },
      });
    }
    if (path === "/api/v1/jobs" && method === "GET") {
      return jsonResponse({
        success: true,
        data: {
          items: [{ ...job, status: state.status }],
          page: 1,
          page_size: 20,
          total: 1,
        },
      });
    }
    if (path === `/api/v1/jobs/${job.id}` && method === "GET") {
      return jsonResponse({ success: true, data: detail() });
    }
    if (path === `/api/v1/jobs/${job.id}/cancel` && method === "POST") {
      state.status = "CANCEL_REQUESTED";
      return jsonResponse({ success: true, data: detail() });
    }
    return jsonResponse(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Not found", details: null },
      },
      404,
    );
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockJobsApi());
});

test("jobs page lists operational executions", async () => {
  renderApp(["/jobs"]);
  expect(await screen.findByText("Customer Data Cleanup")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
  expect(screen.getByText("2 of 4 steps complete")).toBeInTheDocument();
  expect(screen.getAllByText("Running").length).toBeGreaterThan(0);
});

test("job detail shows real step progress and cancel", async () => {
  const user = userEvent.setup();
  renderApp(["/jobs/11111111-1111-4111-8111-111111111111"]);
  expect(await screen.findByText("Steps")).toBeInTheDocument();
  expect(screen.getAllByText(/2 of 4 steps complete/).length).toBeGreaterThan(0);
  expect(screen.getByText(/remove extra spaces/i)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cancel cleanup" }));
  expect((await screen.findAllByText("Stopping")).length).toBeGreaterThanOrEqual(1);
});

test("jobs empty state is not fabricated", async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    if (pathnameOf(url) === "/api/v1/jobs") {
      return jsonResponse({
        success: true,
        data: { items: [], page: 1, page_size: 20, total: 0 },
      });
    }
    return mockJobsApi()(input, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  renderApp(["/jobs"]);
  expect(await screen.findByText("No activity yet")).toBeInTheDocument();
});
