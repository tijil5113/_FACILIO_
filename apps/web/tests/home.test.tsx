import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { dismissOnboarding } from "@/lib/onboarding";
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
    await screen.findByText("Turn messy data into data you can understand and trust."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload my data" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Try FACILIO" })).toBeEnabled();
  expect(screen.getByRole("heading", { name: "How FACILIO helps" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
  expect(screen.queryByText("42%")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Intelligent Data Operations Platform"),
  ).not.toBeInTheDocument();
});

test("home loading state does not flash the empty welcome", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );
  renderApp(["/overview"]);
  expect(screen.getByLabelText("Loading Home")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try FACILIO" })).not.toBeInTheDocument();
});

test("sample-only home keeps upload prominent", async () => {
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
  expect(screen.getByRole("button", { name: "Upload my data" })).toBeEnabled();
  expect(screen.getByText("Sample: Customer data")).toBeInTheDocument();
});

test("returning home prioritizes user datasets", async () => {
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
  expect(await screen.findByText("Continue working")).toBeInTheDocument();
  expect(screen.getByText("orders.csv")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Analyze" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try FACILIO" })).not.toBeInTheDocument();
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
      name: "FACILIO cannot reach the data service right now.",
    }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try FACILIO" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
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
  expect(await screen.findByText("Continue working")).toBeInTheDocument();
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
      if (url.includes(`/api/v1/datasets/${dataset.id}`)) {
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

test("first-use home cue can be dismissed and does not return", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", mockApi({}));
  const first = renderApp(["/overview"]);
  expect(await screen.findByText("Where to start")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Got it" }));
  expect(screen.queryByText("Where to start")).not.toBeInTheDocument();
  first.unmount();
  renderApp(["/overview"]);
  expect(
    await screen.findByText("Turn messy data into data you can understand and trust."),
  ).toBeInTheDocument();
  expect(screen.queryByText("Where to start")).not.toBeInTheDocument();
  dismissOnboarding("home");
});
