import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import type { CleanupPreview, CleanupRecommendations } from "@/types/cleanup";
import { jsonResponse, pathnameOf, requestUrl } from "./helpers";
import { mockDatasetApi } from "./dataset-api";

const datasetId = "11111111-1111-4111-8111-111111111111";
const versionId = "21111111-1111-4111-8111-111111111111";

const recommendations: CleanupRecommendations = {
  dataset_id: datasetId,
  version_id: versionId,
  version_number: 1,
  engine_version: "8c.1",
  actionable_count: 2,
  informational_count: 1,
  selection_policy: "Low-impact text cleanup is preselected.",
  recommendations: [
    {
      recommendation_id: "fix:LEADING_TRAILING_WHITESPACE:name:TRIM_WHITESPACE",
      issue_id: "LEADING_TRAILING_WHITESPACE:name",
      issue_code: "LEADING_TRAILING_WHITESPACE",
      kind: "actionable",
      title: "Extra spaces",
      explanation: "Some values in name contain spaces before or after the text.",
      suggested_cleanup: "Remove extra spaces",
      columns: ["name"],
      evidence: [" Ada"],
      affected_count: 1,
      operation_code: "TRIM_WHITESPACE",
      default_parameters: { column: "name" },
      options: [],
      required_user_configuration: false,
      impact_level: "LOW",
      previewable: true,
      applicable: true,
      not_applicable_reason: null,
      preselected: true,
      execution_rank: 10,
      why: "Surrounding spaces often hide that two values are the same.",
    },
    {
      recommendation_id: "fix:CASE_VARIATION:status:NORMALIZE_CASE",
      issue_id: "CASE_VARIATION:status",
      issue_code: "CASE_VARIATION",
      kind: "actionable",
      title: "Inconsistent capitalization",
      explanation: "status contains values such as:\nACTIVE · active",
      suggested_cleanup: "Make text consistent",
      columns: ["status"],
      evidence: ["ACTIVE", "active"],
      affected_count: 2,
      operation_code: "NORMALIZE_CASE",
      default_parameters: { column: "status", mode: "lowercase" },
      options: [
        {
          field: "mode",
          label: "lowercase",
          value: "lowercase",
          operation_code: "NORMALIZE_CASE",
          parameters: { column: "status", mode: "lowercase" },
        },
        {
          field: "mode",
          label: "Title Case",
          value: "title",
          operation_code: "NORMALIZE_CASE",
          parameters: { column: "status", mode: "title" },
        },
      ],
      required_user_configuration: false,
      impact_level: "LOW",
      previewable: true,
      applicable: true,
      not_applicable_reason: null,
      preselected: true,
      execution_rank: 20,
      why: "The same labels should match before grouping or filtering.",
    },
    {
      recommendation_id: "info:HIGH_CARDINALITY:id",
      issue_id: "HIGH_CARDINALITY:id",
      issue_code: "HIGH_CARDINALITY",
      kind: "informational",
      title: "High cardinality",
      explanation: "id has a high ratio of distinct values.",
      suggested_cleanup: "",
      columns: ["id"],
      evidence: [],
      affected_count: 10,
      operation_code: null,
      default_parameters: {},
      options: [],
      required_user_configuration: false,
      impact_level: null,
      previewable: false,
      applicable: false,
      not_applicable_reason:
        "FACILIO found this, but it doesn't have a safe guided cleanup for it.",
      preselected: false,
      execution_rank: 900,
      why: "This is something to review.",
    },
  ],
};

const preview: CleanupPreview = {
  dataset_id: datasetId,
  input_version_id: versionId,
  input_version_number: 1,
  plan_fingerprint: "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd",
  no_op: false,
  high_impact: false,
  rows_before: 3,
  rows_after: 3,
  columns_before: 2,
  columns_after: 2,
  changed_cell_count: 2,
  removed_row_count: 0,
  removed_column_count: 0,
  warnings: [],
  steps: [
    {
      step_id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      operation_code: "TRIM_WHITESPACE",
      parameters: { column: "name" },
      status: "SUCCEEDED",
      impact: {
        rows_before: 3,
        rows_after: 3,
        columns_before: 2,
        columns_after: 2,
        changed_cell_count: 1,
        removed_row_count: 0,
        removed_column_count: 0,
        affected_row_count: 1,
        no_op: false,
      },
      examples: [],
      warnings: [],
      summary: "1 value changed in name.",
      duration_ms: 1,
      error_code: null,
      error_message: null,
    },
  ],
  examples: [
    {
      kind: "cell",
      row_index: 0,
      column: "name",
      before: " Ada",
      after: "Ada",
      reason: "trim",
      step_position: 0,
      operation_code: "TRIM_WHITESPACE",
      recommendation_id: null,
    },
  ],
  projected_quality: {
    before: 72,
    after: 91,
    delta: 19,
    dimensions: [],
  },
  duration_ms: 4,
  expected_output: "One new cleaned version",
};

function mockCleanupApi(options?: { preview?: CleanupPreview | "noop" | "failure" }) {
  const inner = mockDatasetApi({ profile: "ready" });
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const path = pathnameOf(url);
    const method = init?.method ?? "GET";
    if (path.endsWith("/cleanup-recommendations")) {
      return jsonResponse({ success: true, data: recommendations });
    }
    if (path.endsWith("/cleanup-preview") && method === "POST") {
      if (options?.preview === "failure") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "CLEANUP_PREVIEW_FAILED",
              message: "Preview failed.",
              details: null,
            },
          },
          400,
        );
      }
      if (options?.preview === "noop") {
        return jsonResponse({
          success: true,
          data: { ...preview, no_op: true, changed_cell_count: 0, examples: [] },
        });
      }
      return jsonResponse({ success: true, data: options?.preview ?? preview });
    }
    if (path.endsWith("/cleanup") && method === "POST") {
      const rawBody = typeof init?.body === "string" ? init.body : "{}";
      const body = JSON.parse(rawBody) as {
        plan_fingerprint?: string;
      };
      if (body.plan_fingerprint !== preview.plan_fingerprint) {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "CLEANUP_STALE",
              message: "Preview again.",
              details: null,
            },
          },
          409,
        );
      }
      return jsonResponse(
        {
          success: true,
          data: {
            dataset_id: datasetId,
            input_version_id: versionId,
            input_version_number: 1,
            output_version_id: "31111111-1111-4111-8111-111111111111",
            output_version_number: 2,
            plan_fingerprint: preview.plan_fingerprint,
            impact: preview.steps[0]?.impact,
            quality_delta: preview.projected_quality,
            profile_status: "READY",
            job: {
              id: "41111111-1111-4111-8111-111111111111",
              status: "SUCCEEDED",
              workflow_name: "Guided cleanup",
              current_activity: "Done",
              progress: { current: 1, total: 1, label: "1 of 1 steps complete" },
            },
            workflow_run: {
              id: "51111111-1111-4111-8111-111111111111",
              status: "SUCCEEDED",
              quality_before: 72,
              quality_after: 91,
            },
            original_unchanged: true,
          },
        },
        201,
      );
    }
    return inner(input, init);
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

test("problems offers guided cleanup and preview stays non-destructive", async () => {
  vi.stubGlobal("fetch", mockCleanupApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${datasetId}?tab=problems`]);
  const guidedButtons = await screen.findAllByRole("button", {
    name: "Clean these problems",
  });
  expect(guidedButtons[0]).toBeDefined();
  await user.click(guidedButtons[0] as HTMLElement);
  expect(
    await screen.findByRole("heading", { name: "Choose fixes" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Extra spaces")).toBeInTheDocument();
  expect(
    screen.getAllByText(/doesn’t have a safe guided cleanup/i).length,
  ).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "Preview cleanup" }));
  expect(await screen.findByRole("heading", { name: "Preview" })).toBeInTheDocument();
  expect(screen.getAllByText("Ada").length).toBeGreaterThan(0);
  expect(screen.getByText(/has not changed your data yet/i)).toBeInTheDocument();
  expect(screen.getByText(/72/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Continue to approval" }));
  expect(
    await screen.findByRole("heading", { name: "Ready to clean" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText(/V2 — Cleaned/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/V1 — Original/i).length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "Create cleaned version" }));
  expect(
    await screen.findByRole("heading", { name: "Cleanup complete" }),
  ).toBeInTheDocument();
  expect(screen.getByText("72.0 → 91.0")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save these steps" })).toBeInTheDocument();
});

test("empty selection disables preview", async () => {
  vi.stubGlobal("fetch", mockCleanupApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${datasetId}?tab=cleanup`]);
  await screen.findByRole("heading", { name: "Choose fixes" });
  await user.click(screen.getByRole("button", { name: "Deselect all" }));
  expect(screen.getAllByText(/Choose at least one cleanup step/i).length).toBeGreaterThan(
    0,
  );
  expect(screen.getByRole("button", { name: "Preview cleanup" })).toBeDisabled();
});

test("no-op preview cannot continue to apply", async () => {
  vi.stubGlobal("fetch", mockCleanupApi({ preview: "noop" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${datasetId}?tab=cleanup`]);
  await screen.findByRole("heading", { name: "Choose fixes" });
  await user.click(screen.getByRole("button", { name: "Preview cleanup" }));
  expect(
    (await screen.findAllByText(/wouldn['’]?t change this version/i)).length,
  ).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Continue to approval" })).toBeDisabled();
});
