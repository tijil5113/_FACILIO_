import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { mockApi } from "./helpers";
import { mockDatasetApi, populatedList, sample } from "./dataset-api";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

test("empty datasets state shows upload", async () => {
  vi.stubGlobal("fetch", mockApi({}));
  renderApp(["/datasets"]);
  expect(await screen.findByRole("heading", { name: "Datasets" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload a file" })).toBeEnabled();
  expect(await screen.findByText("No data yet")).toBeInTheDocument();
});

test("populated dataset list renders rows", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp(["/datasets"]);
  expect(await screen.findByText("customers")).toBeInTheDocument();
  expect(screen.getByText("csv")).toBeInTheDocument();
  await user.click(screen.getByText("customers"));
  expect(await screen.findByRole("heading", { name: "customers" })).toBeInTheDocument();
});

test("upload dialog validates unsupported files", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ list: populatedList, upload: "unsupported" }));
  const user = userEvent.setup();
  renderApp(["/datasets"]);
  await user.click(await screen.findByRole("button", { name: "Upload a file" }));
  expect(
    await screen.findByRole("dialog", { name: "Upload a file" }),
  ).toBeInTheDocument();
  const file = new File(["hello"], "notes.txt", { type: "text/plain" });
  const input = screen.getByLabelText("Choose a dataset file");
  fireEvent.change(input, { target: { files: [file] } });
  expect(await screen.findAllByText(/supported formats are/i)).not.toHaveLength(0);
});

test("upload success navigates to workspace", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ upload: "success" }));
  const user = userEvent.setup();
  renderApp(["/datasets"]);
  await user.click(await screen.findByRole("button", { name: "Upload a file" }));
  const file = new File(["name,city\nAda,Paris\n"], "customers.csv", {
    type: "text/csv",
  });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);
  await user.click(screen.getByRole("button", { name: "Upload" }));
  expect(await screen.findByRole("heading", { name: "customers" })).toBeInTheDocument();
});

test("upload failure shows an error", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ upload: "failure" }));
  const user = userEvent.setup();
  renderApp(["/datasets"]);
  await user.click(await screen.findByRole("button", { name: "Upload a file" }));
  const file = new File(["a,b\n1,2,3"], "bad.csv", { type: "text/csv" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);
  await user.click(screen.getByRole("button", { name: "Upload" }));
  expect(await screen.findByText("We couldn't read this CSV")).toBeInTheDocument();
});

test("xlsx sheet selection continues without restarting", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ upload: "sheets" }));
  const user = userEvent.setup();
  renderApp(["/datasets"]);
  await user.click(await screen.findByRole("button", { name: "Upload a file" }));
  const file = new File(["pk"], "orders.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);
  await user.click(screen.getByRole("button", { name: "Upload" }));
  expect(await screen.findByText(/workbook detected/i)).toBeInTheDocument();
  expect(screen.getByText("Archive")).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: /archive/i })).toBeDisabled();
  await user.click(screen.getByRole("radio", { name: /orders/i }));
  await user.click(screen.getByRole("button", { name: "Ingest sheet" }));
  expect(await screen.findByRole("heading", { name: "customers" })).toBeInTheDocument();
});

test("dataset workspace preview renders null distinctly", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  expect(await screen.findByRole("heading", { name: "customers" })).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: "Data" }));
  expect(await screen.findByTitle("Missing value")).toHaveTextContent("(blank)");
  expect(screen.getByText("Ada")).toBeInTheDocument();
});

test("data tab and technical details show real metadata", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await screen.findByRole("heading", { name: "customers" });
  await user.click(screen.getByRole("radio", { name: "Data" }));
  expect(screen.getAllByText("name").length).toBeGreaterThan(0);
  expect(screen.getAllByText("text").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("radio", { name: "Overview" }));
  await user.click(screen.getByText("Technical details"));
  expect(screen.getByText("customers.csv")).toBeInTheDocument();
  expect(screen.getByText("comma")).toBeInTheDocument();
});

test("rename updates the heading", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("button", { name: "Rename" }));
  const field = await screen.findByLabelText("Name");
  await user.clear(field);
  await user.type(field, "Revenue");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("heading", { name: "Revenue" })).toBeInTheDocument();
});

test("delete confirmation names the dataset and returns to the list", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog", { name: "Delete dataset" });
  expect(dialog).toHaveTextContent("customers");
  expect(dialog).toHaveTextContent("customers.csv");
  await user.click(within(dialog).getByRole("button", { name: "Delete dataset" }));
  expect(await screen.findByRole("heading", { name: "Datasets" })).toBeInTheDocument();
});

test("unknown dataset id shows a resource not-found state", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ detail: "missing" }));
  renderApp([`/datasets/${sample.id}`]);
  expect(
    await screen.findByRole("heading", { name: "We couldn't find this dataset" }),
  ).toBeInTheDocument();
});

test("dataset list API errors are visible", async () => {
  vi.stubGlobal("fetch", mockApi({ datasets: "error" }));
  renderApp(["/datasets"]);
  expect(
    await screen.findByText("FACILIO can't reach the data service right now"),
  ).toBeInTheDocument();
});

test("unprofiled workspace offers analyze dataset", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  renderApp([`/datasets/${sample.id}`]);
  expect(await screen.findByText("Not analyzed")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Analyze data" }).length).toBeGreaterThan(
    0,
  );
});

test("analyze dataset loads profile summary and quality", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ analyze: "success" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await screen.findByText("Not analyzed");
  const analyzeButtons = screen.getAllByRole("button", { name: "Analyze data" });
  const firstAnalyze = analyzeButtons[0];
  if (!firstAnalyze) {
    throw new Error("Analyze data button missing");
  }
  await user.click(firstAnalyze);
  expect(await screen.findByText("86.4")).toBeInTheDocument();
  expect(screen.getByText("Good")).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: "Problems" }));
  expect(screen.getAllByText("Not assessed").length).toBeGreaterThan(0);
  expect(screen.getByText("Completeness")).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: "Data" }));
  expect(screen.getAllByText("Ada").length).toBeGreaterThan(0);
  const cityCells = screen.getAllByText("city");
  const explorerCity = cityCells[1] ?? cityCells[0];
  if (!explorerCity) {
    throw new Error("city column not found");
  }
  await user.click(explorerCity);
  expect(screen.getByText("Top values")).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: "Problems" }));
  expect(await screen.findByText("Missing values")).toBeInTheDocument();
});

test("analyze dataset failure stays in the workspace", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ analyze: "failure" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await screen.findByText("Not analyzed");
  const analyzeButtons = screen.getAllByRole("button", { name: "Analyze data" });
  const firstAnalyze = analyzeButtons[0];
  if (!firstAnalyze) {
    throw new Error("Analyze data button missing");
  }
  await user.click(firstAnalyze);
  expect(await screen.findByText("We couldn't analyze this data")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "customers" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry analysis" })).toBeEnabled();
});

test("global quality empty state explains analysis", async () => {
  vi.stubGlobal("fetch", mockApi({}));
  renderApp(["/quality"]);
  expect(
    await screen.findByRole("heading", { name: "Quality overview" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Analyze data/i)).toBeInTheDocument();
});

test("global quality populated state uses real averages", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ profile: "ready" }));
  renderApp(["/quality"]);
  expect(await screen.findByText("Datasets analyzed")).toBeInTheDocument();
  expect(screen.getAllByText("86.4").length).toBeGreaterThan(0);
  expect(screen.getByText("customers")).toBeInTheDocument();
  expect(screen.getByText(/current version only/i)).toBeInTheDocument();
});

test("clean workspace previews and applies a new version", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Clean" }));
  await user.click(await screen.findByRole("button", { name: "Remove extra spaces" }));
  await user.click(screen.getByRole("button", { name: "Preview changes" }));
  expect(await screen.findByText(/1 value would change/i)).toBeInTheDocument();
  expect(screen.getByText(/" Ada"/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Create cleaned version" }));
  expect(await screen.findByText("New version created")).toBeInTheDocument();
  expect(screen.getByText(/V2 created/i)).toBeInTheDocument();
});

test("no-op preview disables apply", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ previewTransform: "noop" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Clean" }));
  await user.click(await screen.findByRole("button", { name: "Remove extra spaces" }));
  await user.click(screen.getByRole("button", { name: "Preview changes" }));
  expect(await screen.findByText("No changes detected")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create cleaned version" })).toBeDisabled();
});

test("preview failure is shown in the workspace", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ previewTransform: "failure" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Clean" }));
  await user.click(await screen.findByRole("button", { name: "Remove extra spaces" }));
  await user.click(screen.getByRole("button", { name: "Preview changes" }));
  expect(
    await screen.findByText("The preview could not be generated."),
  ).toBeInTheDocument();
});

test("apply failure is shown after a successful preview", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ applyTransform: "failure" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Clean" }));
  await user.click(await screen.findByRole("button", { name: "Remove extra spaces" }));
  await user.click(screen.getByRole("button", { name: "Preview changes" }));
  await screen.findByText(/1 value would change/i);
  await user.click(screen.getByRole("button", { name: "Create cleaned version" }));
  expect(
    await screen.findByText("The transformation could not be applied."),
  ).toBeInTheDocument();
});

test("version selector and history are available", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  expect(await screen.findByLabelText("Version")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: /V1 — Original/i })).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: "History" }));
  expect(await screen.findByLabelText("Version lineage")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Use this version" })).toBeEnabled();
  await user.click(screen.getByText("Technical details"));
  expect(screen.getByText("customers.csv")).toBeInTheDocument();
});

test("prepare fix from an issue opens the clean workspace", async () => {
  vi.stubGlobal("fetch", mockDatasetApi({ profile: "ready" }));
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Problems" }));
  await user.click(await screen.findByRole("button", { name: /Review Missing values/i }));
  await user.click(
    screen.getByRole("button", { name: /Open in manual Clean: Fill missing values/i }),
  );
  expect((await screen.findAllByText("Clean data")).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Fill missing values" })).toBeInTheDocument();
});

test("drop column configuration warns before preview", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  const user = userEvent.setup();
  renderApp([`/datasets/${sample.id}`]);
  await user.click(await screen.findByRole("radio", { name: "Clean" }));
  await user.click(await screen.findByRole("button", { name: "Drop column" }));
  expect(screen.getByText(/Removes a column from the new version/i)).toBeInTheDocument();
});

test("dataset list shows the current version", async () => {
  vi.stubGlobal("fetch", mockDatasetApi());
  renderApp(["/datasets"]);
  expect(await screen.findByText("customers")).toBeInTheDocument();
  expect(screen.getByText("V1")).toBeInTheDocument();
});
