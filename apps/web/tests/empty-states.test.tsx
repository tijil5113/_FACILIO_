import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

test("datasets empty state offers a working upload action", async () => {
  renderApp(["/datasets"]);
  expect(await screen.findByRole("heading", { name: "Datasets" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload a file" })).toBeEnabled();
  expect(screen.queryByText(/\d+ rows/i)).not.toBeInTheDocument();
});

test("quality empty state does not display measured scores", async () => {
  renderApp(["/quality"]);
  const placeholders = await screen.findAllByText("Not assessed");
  expect(placeholders.length).toBeGreaterThanOrEqual(5);
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});

test("jobs empty state has no fabricated executions", async () => {
  renderApp(["/jobs"]);
  expect(await screen.findByText("No activity yet")).toBeInTheDocument();
});

test("runs empty state has no fabricated executions", async () => {
  renderApp(["/runs"]);
  expect(await screen.findByText("No run records yet")).toBeInTheDocument();
});

test("exports empty state lists planned formats only", async () => {
  renderApp(["/exports"]);
  expect(await screen.findAllByText("Not generated")).toHaveLength(3);
  expect(screen.getByText("CSV")).toBeInTheDocument();
});
