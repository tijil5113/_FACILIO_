import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { PREFERENCES_STORAGE_KEY } from "@/lib/preferences";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

test("settings can switch theme preference and persist it", async () => {
  const user = userEvent.setup();
  renderApp(["/settings"]);
  await user.click(await screen.findByRole("radio", { name: "Dark" }));
  expect(document.documentElement).toHaveClass("dark");
  const stored = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}") as {
    theme?: string;
  };
  expect(stored.theme).toBe("dark");
});

test("settings can collapse navigation", async () => {
  const user = userEvent.setup();
  renderApp(["/settings"]);
  await user.click(await screen.findByRole("radio", { name: "Collapsed" }));
  expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
});

test("settings can set reduced motion", async () => {
  const user = userEvent.setup();
  renderApp(["/settings"]);
  await user.click(await screen.findByRole("radio", { name: "Reduced" }));
  expect(document.documentElement.dataset.motion).toBe("reduced");
});

test("settings explains the system theme", async () => {
  renderApp(["/settings"]);
  expect(
    await screen.findByText("System follows your device setting."),
  ).toBeInTheDocument();
  expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
});

test("settings shows truthful background processing when the worker is unavailable", async () => {
  vi.stubGlobal("fetch", mockApi({ operationsHealth: "limited" }));
  renderApp(["/settings"]);
  expect(await screen.findByText("Background processing")).toBeInTheDocument();
  expect(await screen.findAllByText("Unavailable")).not.toHaveLength(0);
  expect(screen.getByText(/saved Cleanups cannot start right now/i)).toBeInTheDocument();
  expect(screen.queryByText(/REDIS_URL/i)).not.toBeInTheDocument();
});

test("settings recovers worker availability after refresh", async () => {
  const user = userEvent.setup();
  let workerDown = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) =>
      mockApi({ operationsHealth: workerDown ? "limited" : undefined })(input),
    ),
  );
  renderApp(["/settings"]);
  expect(
    await screen.findByText(/saved Cleanups cannot start right now/i),
  ).toBeInTheDocument();
  workerDown = false;
  await user.click(screen.getByRole("button", { name: "Refresh status" }));
  expect(
    await screen.findByText("Saved Cleanups can start in the background."),
  ).toBeInTheDocument();
});

test("settings database-down copy stays free of connection secrets", async () => {
  vi.stubGlobal("fetch", mockApi({ readiness: "error" }));
  renderApp(["/settings"]);
  expect(await screen.findByText("Database")).toBeInTheDocument();
  expect(await screen.findByText(/saved data isn’t available/i)).toBeInTheDocument();
  expect(screen.queryByText(/DATABASE_URL|postgres:\/\//i)).not.toBeInTheDocument();
});
