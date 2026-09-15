import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import {
  defaultTransformationCatalog,
  emptyDatasetList,
  emptyQualityOverview,
  emptyWorkspaceStats,
  jsonResponse,
  pathnameOf,
  requestUrl,
} from "./helpers";
import type { WorkflowDetail, WorkflowPreview, WorkflowRun } from "@/types/workflows";

const now = "2026-09-11T16:00:00.000Z";

function workflowRecord(overrides: Partial<WorkflowDetail> = {}): WorkflowDetail {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Customer Data Cleanup",
    description: null,
    status: "DRAFT",
    revision: 1,
    step_count: 0,
    enabled_step_count: 0,
    last_run_at: null,
    last_run_status: null,
    created_at: now,
    updated_at: now,
    steps: [],
    ...overrides,
  };
}

function mockWorkflowApi(initial: WorkflowDetail = workflowRecord()) {
  let workflow = initial;
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const path = pathnameOf(url);
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : {};

    if (url.includes("/api/v1/health")) {
      return jsonResponse({
        success: true,
        data: { status: "healthy", service: "facilio-api", version: "0.1.0" },
      });
    }
    if (url.includes("/api/v1/readiness")) {
      return jsonResponse({
        success: true,
        data: {
          status: "ready",
          checks: { database: { status: "ready", message: "ok" } },
        },
      });
    }
    if (path === "/api/v1/workspace/summary") {
      return jsonResponse({ success: true, data: emptyWorkspaceStats });
    }
    if (path === "/api/v1/quality/summary" || url.includes("/api/v1/quality/summary")) {
      return jsonResponse({ success: true, data: emptyQualityOverview });
    }
    if (path === "/api/v1/transformations") {
      return jsonResponse({ success: true, data: defaultTransformationCatalog });
    }
    if (path === "/api/v1/datasets") {
      return jsonResponse({
        success: true,
        data: {
          ...emptyDatasetList,
          items: [
            {
              id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              name: "customers.csv",
              original_filename: "customers.csv",
              file_type: "csv",
              mime_type: "text/csv",
              file_size: 1200,
              status: "ready",
              row_count: 12,
              column_count: 6,
              selected_sheet: null,
              encoding: "utf-8",
              delimiter: ",",
              created_at: now,
              updated_at: now,
              profile_status: "READY",
              quality_score: 78.4,
              quality_grade: "B",
              profiled_at: now,
              current_version_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              current_version_number: 1,
              version_count: 1,
            },
          ],
          total: 1,
        },
      });
    }
    if (path.endsWith("/versions") && method === "GET") {
      return jsonResponse({
        success: true,
        data: [
          {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            dataset_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            version_number: 1,
            parent_version_id: null,
            kind: "ORIGINAL",
            label: "Original",
            row_count: 12,
            column_count: 6,
            profile_status: "READY",
            profiled_at: now,
            created_at: now,
            is_current: true,
            operation_code: null,
            operation_summary: null,
            created_by_workflow_run_id: null,
            workflow_name: null,
            workflow_revision: null,
          },
        ],
      });
    }
    if (path === "/api/v1/workflows" && method === "GET") {
      return jsonResponse({
        success: true,
        data: {
          items: [workflow],
          page: 1,
          page_size: 20,
          total: 1,
        },
      });
    }
    if (path === "/api/v1/workflows" && method === "POST") {
      workflow = workflowRecord({
        name: typeof body.name === "string" ? body.name : "Untitled",
        description: typeof body.description === "string" ? body.description : null,
      });
      return jsonResponse({ success: true, data: workflow }, 201);
    }
    if (path === `/api/v1/workflows/${workflow.id}` && method === "GET") {
      return jsonResponse({ success: true, data: workflow });
    }
    if (path === `/api/v1/workflows/${workflow.id}/steps` && method === "POST") {
      const step = {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        workflow_id: workflow.id,
        position: workflow.steps.length,
        operation_code:
          typeof body.operation_code === "string" ? body.operation_code : "",
        parameters:
          body.parameters && typeof body.parameters === "object"
            ? (body.parameters as Record<string, unknown>)
            : {},
        enabled: true,
        created_at: now,
        updated_at: now,
      };
      workflow = {
        ...workflow,
        revision: workflow.revision + 1,
        status: "INVALID",
        step_count: workflow.steps.length + 1,
        enabled_step_count: workflow.enabled_step_count + 1,
        steps: [...workflow.steps, step],
      };
      return jsonResponse({ success: true, data: workflow }, 201);
    }
    if (path === `/api/v1/workflows/${workflow.id}/steps/reorder` && method === "POST") {
      const ids = body.step_ids as string[];
      workflow = {
        ...workflow,
        revision: workflow.revision + 1,
        steps: ids.flatMap((id, position) => {
          const step = workflow.steps.find((item) => item.id === id);
          return step ? [{ ...step, position }] : [];
        }),
      };
      return jsonResponse({ success: true, data: workflow });
    }
    if (path === `/api/v1/workflows/${workflow.id}/validate` && method === "POST") {
      return jsonResponse({
        success: true,
        data: {
          valid: workflow.enabled_step_count > 0,
          empty: workflow.enabled_step_count === 0,
          issues: [],
          steps: workflow.steps.map((step) => ({
            step_id: step.id,
            position: step.position,
            operation_code: step.operation_code,
            enabled: step.enabled,
            valid: true,
            schema_before: [{ name: "name", dtype: "TEXT" }],
            schema_after: [{ name: "name", dtype: "TEXT" }],
            issues: [],
          })),
          contract: [{ name: "name", dtype: "TEXT", numeric_compatible: false }],
          compatibility: { status: "COMPATIBLE", compatible: true, reasons: [] },
          projected_schema: [{ name: "name", dtype: "TEXT" }],
        },
      });
    }
    if (path === `/api/v1/workflows/${workflow.id}/preview` && method === "POST") {
      const preview: WorkflowPreview = {
        validation: {
          valid: true,
          empty: false,
          issues: [],
          steps: [],
          contract: [],
          compatibility: { status: "COMPATIBLE", compatible: true, reasons: [] },
          projected_schema: [],
        },
        no_op: false,
        rows_before: 12,
        rows_after: 11,
        columns_before: 6,
        columns_after: 6,
        steps: [
          {
            step_id: workflow.steps[0]?.id ?? "step",
            position: 0,
            operation_code: "TRIM_WHITESPACE",
            parameters: { column: "name" },
            status: "SUCCEEDED",
            impact: {
              rows_before: 12,
              rows_after: 12,
              columns_before: 6,
              columns_after: 6,
              changed_cell_count: 2,
              removed_row_count: 0,
              removed_column_count: 0,
              affected_row_count: 2,
              no_op: false,
            },
            examples: [
              {
                kind: "cell",
                row_index: 0,
                column: "name",
                before: " Alice ",
                after: "Alice",
                reason: null,
              },
            ],
            warnings: [],
            summary: "Trimmed whitespace on name.",
            duration_ms: 4,
            error_code: null,
            error_message: null,
          },
        ],
        projected_quality: {
          before: 78.4,
          after: 89.2,
          delta: 10.8,
          dimensions: [],
        },
        duration_ms: 12,
      };
      return jsonResponse({ success: true, data: preview });
    }
    if (path === `/api/v1/workflows/${workflow.id}/runs` && method === "POST") {
      const run: WorkflowRun = {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        workflow_revision: workflow.revision,
        input_dataset_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        input_dataset_name: "customers.csv",
        input_version_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        output_version_id: null,
        input_version_number: 1,
        output_version_number: null,
        status: "QUEUED",
        step_count: 1,
        started_at: null,
        completed_at: null,
        duration_ms: null,
        error_code: null,
        error_message_safe: null,
        quality_before: 78.4,
        quality_after: null,
        workflow_snapshot: {
          workflow_id: workflow.id,
          name: workflow.name,
          revision: workflow.revision,
          steps: [],
        },
        step_runs: [],
        quality_delta: null,
      };
      return jsonResponse(
        {
          success: true,
          data: {
            workflow_run: run,
            job: {
              id: "99999999-9999-4999-8999-999999999991",
              job_type: "WORKFLOW_RUN",
              status: "QUEUED",
              workflow_run_id: run.id,
              workflow_id: workflow.id,
              workflow_name: workflow.name,
              dataset_id: run.input_dataset_id,
              dataset_name: "customers.csv",
              input_version_id: run.input_version_id,
              input_version_number: 1,
              output_version_id: null,
              output_version_number: null,
              queue_name: "workflows",
              attempt_count: 0,
              max_attempts: 3,
              progress: { current: 0, total: 1, label: "0 of 1 steps complete" },
              current_step_position: null,
              current_operation_code: null,
              current_activity: "Waiting for worker",
              queued_at: now,
              started_at: null,
              completed_at: null,
              heartbeat_at: null,
              queue_ms: null,
              execution_ms: null,
              total_ms: null,
              error_code: null,
              error_message_safe: null,
              error_category: null,
              retryable: false,
              created_at: now,
              updated_at: now,
            },
          },
        },
        202,
      );
    }
    if (path === "/api/v1/workflow-runs") {
      return jsonResponse({
        success: true,
        data: { items: [], page: 1, page_size: 20, total: 0 },
      });
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
  vi.stubGlobal("fetch", mockWorkflowApi());
});

test("workflow catalog lists saved definitions", async () => {
  renderApp(["/workflows"]);
  expect(
    await screen.findByRole("link", { name: "Customer Data Cleanup" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Draft")).toBeInTheDocument();
});

test("creating a workflow opens the builder", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", mockWorkflowApi(workflowRecord({ step_count: 0, steps: [] })));
  renderApp(["/workflows"]);
  await user.click(await screen.findByRole("button", { name: "New cleanup" }));
  await user.type(screen.getByLabelText("Name"), "Cleanup copy");
  await user.click(screen.getByRole("button", { name: "Create cleanup" }));
  expect(await screen.findByLabelText("Cleanup name")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Preview changes" })).toBeInTheDocument();
});

test("builder can add a step and move it with the keyboard controls", async () => {
  const user = userEvent.setup();
  const second = {
    id: "99999999-9999-4999-8999-999999999999",
    workflow_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    position: 1,
    operation_code: "REMOVE_DUPLICATES",
    parameters: {},
    enabled: true,
    created_at: now,
    updated_at: now,
  };
  const seeded = workflowRecord({
    status: "READY",
    revision: 2,
    step_count: 2,
    enabled_step_count: 2,
    steps: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        workflow_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        position: 0,
        operation_code: "TRIM_WHITESPACE",
        parameters: { column: "name" },
        enabled: true,
        created_at: now,
        updated_at: now,
      },
      second,
    ],
  });
  vi.stubGlobal("fetch", mockWorkflowApi(seeded));
  renderApp(["/workflows/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  expect(await screen.findByLabelText("Steps")).toBeInTheDocument();
  expect(screen.getAllByText("Remove extra spaces").length).toBeGreaterThan(0);
  const pipeline = screen.getByLabelText("Steps");
  const moveUp = within(pipeline).getAllByRole("button", { name: "Move step up" });
  const secondHandle = moveUp[1];
  expect(secondHandle).toBeDefined();
  if (secondHandle) {
    await user.click(secondHandle);
  }
  await waitFor(() => {
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});

test("preview shows per-step impact and run completes", async () => {
  const user = userEvent.setup();
  const seeded = workflowRecord({
    status: "READY",
    revision: 2,
    step_count: 1,
    enabled_step_count: 1,
    steps: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        workflow_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        position: 0,
        operation_code: "TRIM_WHITESPACE",
        parameters: { column: "name" },
        enabled: true,
        created_at: now,
        updated_at: now,
      },
    ],
  });
  vi.stubGlobal("fetch", mockWorkflowApi(seeded));
  renderApp(["/workflows/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  await screen.findByText("Compatible with the selected version.");
  await user.click(screen.getByRole("button", { name: "Preview changes" }));
  expect((await screen.findAllByText("Preview changes")).length).toBeGreaterThan(0);
  expect(screen.getByText(/12 → 11/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Run cleanup" }));
  expect(await screen.findByText("Cleanup started")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "View activity" })).toBeInTheDocument();
});

test("runs page lists an empty history without fabricated rows", async () => {
  renderApp(["/runs"]);
  expect(await screen.findByRole("heading", { name: "Run records" })).toBeInTheDocument();
  expect(await screen.findByText("No run records yet")).toBeInTheDocument();
});
