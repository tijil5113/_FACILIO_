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
