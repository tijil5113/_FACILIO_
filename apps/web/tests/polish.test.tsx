import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/app/ErrorBoundary";
import { renderApp } from "@/app/test-utils";
import { jobsListRefetchInterval } from "@/features/jobs/queries";
import { PREFERENCES_STORAGE_KEY } from "@/lib/preferences";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
  window.history.pushState({}, "", "/overview");
});

test("error boundary offers try again and home", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  function Boom(): ReactNode {
    throw new Error("render failed");
  }
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  expect(
    screen.getByRole("heading", { name: "Something prevented this page from loading." }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Go Home" })).toBeInTheDocument();
  expect(screen.getByText("render failed")).toBeInTheDocument();
});

test("route changes move focus to main content", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await screen.findByRole("heading", {
    name: "Turn messy data into data you can understand and trust.",
  });
  await user.click(screen.getByRole("link", { name: "Datasets" }));
  expect(document.getElementById("main-content")).toHaveFocus();
});

test("settings can set full motion", async () => {
  const user = userEvent.setup();
  renderApp(["/settings"]);
  await user.click(await screen.findByRole("radio", { name: "Full" }));
  expect(document.documentElement.dataset.motion).toBe("full");
  const stored = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}") as {
    motion?: string;
  };
  expect(stored.motion).toBe("full");
});

test("activity list polling stops after terminal statuses", () => {
  expect(jobsListRefetchInterval([{ status: "RUNNING" }])).toBe(2000);
  expect(jobsListRefetchInterval([{ status: "QUEUED" }])).toBe(2000);
  expect(jobsListRefetchInterval([{ status: "SUCCEEDED" }])).toBe(false);
  expect(jobsListRefetchInterval([{ status: "FAILED" }, { status: "CANCELLED" }])).toBe(
    false,
  );
});
