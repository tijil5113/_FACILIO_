import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.restoreAllMocks();
});

test("home renders the product goal", async () => {
  vi.stubGlobal("fetch", mockApi({}));
  renderApp(["/overview"]);
  expect(
    await screen.findByText("Turn messy data into data you can understand and trust."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload your data" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Try FACILIO" })).toBeEnabled();
  expect(
    screen.queryByText("Intelligent Data Operations Platform"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Platform capabilities")).not.toBeInTheDocument();
});

test("healthy home does not dominate with infrastructure status", async () => {
  vi.stubGlobal("fetch", mockApi({}));
  renderApp(["/overview"]);
  expect(
    await screen.findByText("Turn messy data into data you can understand and trust."),
  ).toBeInTheDocument();
  expect(screen.queryByText("Operational")).not.toBeInTheDocument();
  expect(screen.queryByText("SQLAlchemy")).not.toBeInTheDocument();
});

test("compact health shows checking while the API is pending", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );
  renderApp(["/overview"]);
  expect(screen.getByText("Checking")).toBeInTheDocument();
});

test("home shows degraded health when the API cannot be reached", async () => {
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
  expect(screen.queryByText("Operational")).not.toBeInTheDocument();
});

test("settings shows detailed system status and retry", async () => {
  const fetchMock = mockApi({});
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  renderApp(["/settings"]);
  expect(
    await screen.findByRole("heading", { name: "System status" }),
  ).toBeInTheDocument();
  expect(await screen.findAllByText("Available")).not.toHaveLength(0);
  expect(screen.getAllByText("0.1.0").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "Refresh status" }));
  expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
});

test("settings reports an unconfigured database from readiness", async () => {
  vi.stubGlobal("fetch", mockApi({ readiness: "not_ready" }));
  renderApp(["/settings"]);
  expect(
    await screen.findByRole("heading", { name: "System status" }),
  ).toBeInTheDocument();
  expect(await screen.findAllByText("Limited")).not.toHaveLength(0);
});
