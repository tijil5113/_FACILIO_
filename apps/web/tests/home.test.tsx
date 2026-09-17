import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import {
  ILLUSTRATIVE_DISCLAIMER,
  WELCOME_HEADLINE,
} from "@/features/overview/home-content";
import type { DatasetSummary } from "@/types/dataset";
import { emptyDatasetList, mockApi } from "./helpers";

const sampleDataset: DatasetSummary = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Sample: Customer data",
  original_filename: "facilio-demo-customers.csv",
  file_type: "csv",
  mime_type: "text/csv",
  file_size: 1024,
  status: "ready",
  row_count: 20,
  column_count: 8,
  selected_sheet: null,
  encoding: "utf-8",
  delimiter: ",",
  created_at: "2026-09-14T12:00:00.000Z",
  updated_at: "2026-09-14T12:00:00.000Z",
  profile_status: "READY",
  quality_score: 96,
  quality_grade: "Excellent",
  profiled_at: "2026-09-14T12:01:00.000Z",
  current_version_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  current_version_number: 1,
  version_count: 1,
  is_sample: true,
  sample_key: "CUSTOMER_CLEANUP",
  issue_count: 13,
};

const userDataset: DatasetSummary = {
  ...sampleDataset,
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  name: "orders.csv",
  original_filename: "orders.csv",
  is_sample: false,
  sample_key: null,
  profile_status: "NOT_PROFILED",
  quality_score: null,
  quality_grade: null,
  profiled_at: null,
  issue_count: null,
};

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

test("first-run home explains FACILIO and offers upload plus sample", async () => {
  vi.stubGlobal("fetch", mockApi({}));
  renderApp(["/overview"]);
  expect(
    await screen.findByRole("heading", { level: 1, name: WELCOME_HEADLINE }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload your data" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Try FACILIO" })).toBeEnabled();
  expect(screen.getByRole("heading", { name: "How FACILIO works" })).toBeInTheDocument();
  expect(screen.getAllByText(/CSV, Excel, or JSON/).length).toBeGreaterThan(0);
  expect(screen.getByText("Bring data")).toBeInTheDocument();
  expect(screen.getByText("Find problems")).toBeInTheDocument();
  expect(screen.getByTestId("home-signature-visual")).toHaveAccessibleName(
    /Illustration/i,
  );
  expect(screen.getByText(ILLUSTRATIVE_DISCLAIMER)).toBeInTheDocument();
  expect(screen.queryByText("42%")).not.toBeInTheDocument();
  expect(screen.queryByText("Hours saved")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Intelligent Data Operations Platform"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "How FACILIO helps" }),
  ).not.toBeInTheDocument();
});

test("first-run keyboard order reaches upload before try FACILIO", async () => {
  vi.stubGlobal("fetch", mockApi({}));
  renderApp(["/overview"]);
  const upload = await screen.findByRole("button", { name: "Upload your data" });
  const sample = screen.getByRole("button", { name: "Try FACILIO" });
  expect(
    upload.compareDocumentPosition(sample) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    sample.compareDocumentPosition(screen.getByTestId("home-signature-visual")) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test("home loading state does not flash the empty welcome", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );
  renderApp(["/overview"]);
  expect(await screen.findByLabelText("Loading Home")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try FACILIO" })).not.toBeInTheDocument();
  expect(screen.queryByText(WELCOME_HEADLINE)).not.toBeInTheDocument();
});

test("sample-only home keeps upload available and names the sample", async () => {
  vi.stubGlobal(
    "fetch",
    mockApi({
      datasets: {
        ...emptyDatasetList,
        items: [sampleDataset],
        total: 1,
      },
    }),
  );
  renderApp(["/overview"]);
  expect(await screen.findByText("Continue exploring the sample")).toBeInTheDocument();
  expect(
    screen.getByText(/You’re exploring FACILIO with sample data/),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload my data" })).toBeEnabled();
  expect(screen.getByText("Sample: Customer data")).toBeInTheDocument();
  expect(screen.getByText("Example data")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try FACILIO" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: WELCOME_HEADLINE }),
  ).not.toBeInTheDocument();
});

test("returning home prioritizes user datasets and hides the welcome hero", async () => {
  vi.stubGlobal(
    "fetch",
    mockApi({
      datasets: {
        ...emptyDatasetList,
        items: [userDataset, sampleDataset],
        total: 2,
      },
    }),
  );
  renderApp(["/overview"]);
  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
  expect(screen.getByText("orders.csv")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Analyze" })).toHaveAttribute(
    "href",
    `/datasets/${userDataset.id}?analyze=1`,
  );
  expect(screen.queryByRole("button", { name: "Try FACILIO" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: WELCOME_HEADLINE }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "How FACILIO works" }),
  ).not.toBeInTheDocument();
});

test("home degrades when the API is down and hides sample CTAs", async () => {
  vi.stubGlobal(
    "fetch",
    mockApi({ health: "error", readiness: "error", datasets: "error" }),
  );
  renderApp(["/overview"]);
  await waitFor(() => {
    expect(screen.getByTestId("home-kind")).toHaveAttribute("data-kind", "degraded");
  });
  expect(
    screen.getByRole("heading", {
      name: "FACILIO can’t load your workspace right now.",
    }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try FACILIO" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Upload your data" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
});

test("limited health keeps upload available and explains cleanup impact", async () => {
  vi.stubGlobal("fetch", mockApi({ operationsHealth: "limited" }));
  renderApp(["/overview"]);
  expect(await screen.findByText(WELCOME_HEADLINE)).toBeInTheDocument();
  expect(
    screen.getByText("Some cleanup actions are temporarily unavailable"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload your data" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Try FACILIO" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
});

test("returning home does not lead with a limited cleanup banner", async () => {
  vi.stubGlobal(
    "fetch",
    mockApi({
      datasets: {
        ...emptyDatasetList,
        items: [userDataset],
        total: 1,
      },
      operationsHealth: "limited",
    }),
  );
  renderApp(["/overview"]);
  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
  expect(
    screen.queryByText("Some cleanup actions are temporarily unavailable"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Limited")).toBeInTheDocument();
});

test("partial activity failure does not destroy returning home", async () => {
  vi.stubGlobal(
    "fetch",
    mockApi({
      datasets: {
        ...emptyDatasetList,
        items: [userDataset],
        total: 1,
      },
      jobs: "error",
    }),
  );
  renderApp(["/overview"]);
  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
  expect(await screen.findByText("Activity couldn’t load")).toBeInTheDocument();
  expect(screen.getByText("orders.csv")).toBeInTheDocument();
});

test("Try FACILIO disables while importing and opens the sample", async () => {
  const user = userEvent.setup();
  const dataset = {
    ...sampleDataset,
    columns: [],
    error_code: null,
    error_message: null,
    profile_status: "NOT_PROFILED" as const,
    issue_count: null,
    quality_score: null,
  };
  let importCalls = 0;
  const fetchMock = mockApi({ sample: dataset });
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/samples/customers/import")) {
        importCalls += 1;
        return fetchMock(input);
      }
      if (url.includes(`/api/v1/datasets/${dataset.id}/versions`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: dataset.current_version_id,
                  dataset_id: dataset.id,
                  version_number: 1,
                  parent_version_id: null,
                  kind: "ORIGINAL",
                  label: "Original",
                  row_count: dataset.row_count,
                  column_count: dataset.column_count,
                  profile_status: dataset.profile_status,
                  profiled_at: dataset.profiled_at,
                  created_at: dataset.created_at,
                  is_current: true,
                  operation_code: null,
                  operation_summary: null,
                  created_by_workflow_run_id: null,
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", "X-Request-ID": "t" },
            },
          ),
        );
      }
      if (
        url.includes(`/api/v1/datasets/${dataset.id}`) &&
        !url.includes("/preview") &&
        !url.includes("/profile") &&
        !url.includes("/issues")
      ) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: dataset }), {
            status: 200,
            headers: { "Content-Type": "application/json", "X-Request-ID": "t" },
          }),
        );
      }
      return fetchMock(input);
    }),
  );
  renderApp(["/overview"]);
  const tryButton = await screen.findByRole("button", { name: "Try FACILIO" });
  await user.click(tryButton);
  await user.click(tryButton);
  await waitFor(() => {
    expect(importCalls).toBe(1);
  });
  expect(await screen.findByRole("heading", { name: dataset.name })).toBeInTheDocument();
});

test("sample import failure stays recoverable on Home", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", mockApi({ sample: "error" }));
  renderApp(["/overview"]);
  await user.click(await screen.findByRole("button", { name: "Try FACILIO" }));
  expect(await screen.findByRole("button", { name: "Try again" })).toBeEnabled();
  expect(
    screen.getAllByRole("button", { name: "Upload your data" }).length,
  ).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Try FACILIO" })).toBeEnabled();
});

test("returning home stays bounded and truncates a long dataset name", async () => {
  const longName =
    "quarterly-customer-export-from-the-finance-ops-team-with-an-extremely-long-filename.csv";
  const many = Array.from({ length: 12 }, (_, index) => ({
    ...userDataset,
    id: `dddddddd-dddd-4ddd-8ddd-dddddddddd${String(index).padStart(2, "0")}`,
    name: index === 0 ? longName : `dataset-${String(index)}.csv`,
    profile_status: "READY" as const,
    issue_count: 0,
  }));
  vi.stubGlobal(
    "fetch",
    mockApi({
      datasets: {
        ...emptyDatasetList,
        items: many,
        total: many.length,
      },
    }),
  );
  renderApp(["/overview"]);
  expect(await screen.findByText(longName)).toBeInTheDocument();
  expect(screen.queryByText("dataset-6.csv")).not.toBeInTheDocument();
  expect(screen.queryByText("Fix problems")).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "View dataset" }).length).toBeGreaterThan(0);
});

test("returning home omits activity when there is none", async () => {
  vi.stubGlobal(
    "fetch",
    mockApi({
      datasets: {
        ...emptyDatasetList,
        items: [userDataset],
        total: 1,
      },
      jobs: { items: [], page: 1, page_size: 5, total: 0 },
    }),
  );
  renderApp(["/overview"]);
  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Recent activity" }),
  ).not.toBeInTheDocument();
});

test("analyzed datasets with problems offer review, not a fake fix", async () => {
  vi.stubGlobal(
    "fetch",
    mockApi({
      datasets: {
        ...emptyDatasetList,
        items: [{ ...userDataset, profile_status: "READY", issue_count: 4 }],
        total: 1,
      },
    }),
  );
  renderApp(["/overview"]);
  expect(await screen.findByRole("link", { name: "Review problems" })).toHaveAttribute(
    "href",
    `/datasets/${userDataset.id}?tab=problems`,
  );
  expect(screen.queryByText("Fix problems")).not.toBeInTheDocument();
});

test("failed analysis does not present a zero quality score", async () => {
  vi.stubGlobal(
    "fetch",
    mockApi({
      datasets: {
        ...emptyDatasetList,
        items: [
          {
            ...userDataset,
            profile_status: "FAILED",
            quality_score: null,
            issue_count: null,
          },
        ],
        total: 1,
      },
    }),
  );
  renderApp(["/overview"]);
  expect(await screen.findByRole("link", { name: "Try analysis again" })).toHaveAttribute(
    "href",
    `/datasets/${userDataset.id}?analyze=1`,
  );
  expect(screen.getByText(/Analysis didn.t finish/)).toBeInTheDocument();
  expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  expect(screen.queryByText("Quality 0")).not.toBeInTheDocument();
});

test("upload from first-run opens the existing upload dialog", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", mockApi({}));
  renderApp(["/overview"]);
  await user.click(await screen.findByRole("button", { name: "Upload your data" }));
  expect(
    await screen.findByRole("dialog", { name: "Upload a file" }),
  ).toBeInTheDocument();
});
