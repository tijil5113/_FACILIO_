import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import {
  derivedVersionId,
  highCardinalityIssue,
  mockDatasetApi,
  readyIssues,
  readyProfile,
  sample,
  specialPreview,
} from "./dataset-api";

test("sample datasets are labeled without warning styling", async () => {
  vi.stubGlobal(
    "fetch",
    mockDatasetApi({
      list: {
        items: [{ ...sample, is_sample: true, name: "Sample: Customers" }],
        page: 1,
        page_size: 20,
        total: 1,
        max_upload_size_mb: 16,
        supported_file_types: ["csv", "xlsx", "json"],
      },
    }),
  );
  renderApp(["/datasets"]);
  expect(await screen.findByText("Sample: Customers")).toBeInTheDocument();
  expect(screen.getByText("Sample")).toBeInTheDocument();
});

test("long dataset names remain available as the full title", async () => {
  const name = "customers-q3-north-america-finance-export-final-revised.csv";
  vi.stubGlobal(
    "fetch",
    mockDatasetApi({
      detail: { ...sample, name },
    }),
  );
  renderApp([`/datasets/${sample.id}`]);
  const heading = await screen.findByRole("heading", { name });
  expect(heading).toHaveAttribute("title", name);
});

test("viewing an older version is distinct from the using version", async () => {
  vi.stubGlobal(
    "fetch",
    mockDatasetApi({
      versions: "v1-v2",
      detail: {
        ...sample,
        current_version_id: derivedVersionId,
        current_version_number: 2,
        version_count: 2,
      },
    }),
  );
  renderApp([`/datasets/${sample.id}?version=${sample.current_version_id as string}`]);
  expect(await screen.findByText(/Viewing V1 — Original/)).toBeInTheDocument();
  expect(screen.getByText(/Currently using V2 — Cleaned/)).toBeInTheDocument();
  expect(
    screen.getAllByRole("button", { name: "Use this version" }).length,
  ).toBeGreaterThan(0);
});

test("data preview keeps zero and false visible and states the preview bound", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ preview: specialPreview }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await screen.findByRole("heading", { name: "customers" });
  await user.click(screen.getByRole("radio", { name: "Data" }));
  expect(await screen.findByText("0")).toBeInTheDocument();
  expect(screen.getAllByText("false").length).toBeGreaterThan(0);
  expect(screen.getByTitle("Missing value")).toHaveTextContent("Missing");
  expect(screen.getByTitle("Blank value")).toHaveTextContent("Blank");
  expect(screen.getByText(/Preview of 3 of 40 rows/)).toBeInTheDocument();
  expect(screen.getByText(/Scroll sideways/)).toBeInTheDocument();
});

test("problems zero state is not a perfection claim", async () => {
  vi.stubGlobal(
    "fetch",
    mockDatasetApi({
      profile: "ready",
      profileData: {
        ...readyProfile,
        issue_counts: { total: 0, critical: 0, warning: 0, info: 0 },
      },
      issues: [],
    }),
  );
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Problems" }));
  expect(
    await screen.findByText("No problems detected by the current checks."),
  ).toBeInTheDocument();
  expect(screen.queryByText("Your data is perfect.")).not.toBeInTheDocument();
});

test("problems not-analyzed state asks for analysis", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Problems" }));
  expect(await screen.findByText("Analysis required")).toBeInTheDocument();
  expect(
    screen.getAllByRole("button", { name: "Analyze dataset" }).length,
  ).toBeGreaterThan(0);
  expect(
    screen.queryByText("No problems detected by the current checks."),
  ).not.toBeInTheDocument();
});

test("profile failure is not shown as zero problems", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ profile: "failed" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Problems" }));
  expect(await screen.findAllByText(/couldn't finish analyzing/i)).not.toHaveLength(0);
  expect(
    screen.queryByText("No problems detected by the current checks."),
  ).not.toBeInTheDocument();
});

test("problem evidence and informational high cardinality stay secondary", async () => {
  vi.stubGlobal(
    "fetch",
    mockDatasetApi({
      profile: "ready",
      issues: [
        {
          ...(readyIssues.find((issue) => issue.code === "MISSING_VALUES") ??
            highCardinalityIssue),
          evidence: ["  Ada"],
        },
        highCardinalityIssue,
      ],
    }),
  );
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}?tab=problems`]);
  expect(await screen.findByText("Missing information")).toBeInTheDocument();
  expect(screen.getByText("Structure")).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: /Review High cardinality in id/i }),
  );
  expect(screen.getByText(/not dataset corruption/i)).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: /Review Missing values in city/i }),
  );
  await user.click(screen.getByText("Evidence"));
  expect(screen.getByText(/Ada/)).toBeInTheDocument();
  expect(screen.getByText("MISSING_VALUES")).toBeInTheDocument();
});

test("history shows branched parent relationships", async () => {
  vi.stubGlobal(
    "fetch",
    mockDatasetApi({
      versions: "branched",
      detail: { ...sample, version_count: 3 },
    }),
  );
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "History" }));
  expect((await screen.findAllByText("V2 — Cleaned")).length).toBeGreaterThan(0);
  expect(screen.getAllByText("V3 — Cleaned").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Created from V1 — Original/).length).toBeGreaterThan(0);
  expect(
    screen.getByLabelText("Versions created from V1 — Original"),
  ).toBeInTheDocument();
});

test("version comparison presents quality as a descriptive delta", async () => {
  vi.stubGlobal(
    "fetch",
    mockDatasetApi({
      versions: "v1-v2",
      detail: {
        ...sample,
        current_version_id: derivedVersionId,
        current_version_number: 2,
        version_count: 2,
      },
    }),
  );
  renderApp([`/datasets/${sample.id}?version=${derivedVersionId}&tab=history`]);
  expect(await screen.findByText("Compare versions")).toBeInTheDocument();
  expect(screen.getByText("86.4 → 90.0")).toBeInTheDocument();
  expect(screen.queryByText(/improvement/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Use this version" })).toBeEnabled();
});

test("clean entry explains preservation without replacing guided cleanup", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ profile: "ready" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Clean" }));
  expect(
    await screen.findByText(
      "Cleaning creates a new version. Your original stays unchanged.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review suggestions" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Remove extra spaces" })).toBeInTheDocument();
});
