import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { detectHelpContext } from "@/features/help/help-context";
import { HELP_CONTENT } from "@/features/help/help-content";
import { renderApp } from "@/app/test-utils";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

test("help context changes by route", () => {
  expect(detectHelpContext("/overview")).toBe("home");
  expect(detectHelpContext("/datasets")).toBe("datasets");
  expect(detectHelpContext("/datasets/abc", "?tab=problems")).toBe("problems");
  expect(detectHelpContext("/datasets/abc", "?tab=cleanup")).toBe("guided-cleanup");
  expect(detectHelpContext("/datasets/abc", "?tab=history")).toBe("history");
  expect(detectHelpContext("/workflows")).toBe("cleanups");
  expect(detectHelpContext("/jobs")).toBe("activity");
  expect(detectHelpContext("/settings")).toBe("settings");
  expect(HELP_CONTENT.home.title).toBe("Home");
  expect(HELP_CONTENT.dataset.question).toMatch(/quality/i);
  expect(HELP_CONTENT.problems.question).toMatch(/flag/i);
  expect(HELP_CONTENT["guided-cleanup"].question).toMatch(/original/i);
  expect(HELP_CONTENT.history.question).toMatch(/Using/i);
  expect(HELP_CONTENT["cleanup-builder"].question).toMatch(/order/i);
  expect(HELP_CONTENT.activity.question).toMatch(/Needs attention/i);
  expect(HELP_CONTENT.history.goodToKnow.join(" ")).toMatch(/does not delete/i);
});

test("help drawer opens from the header, is labelled, and restores focus", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  const trigger = await screen.findByRole("button", { name: "Help" });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Home" });
  expect(dialog).toHaveAttribute("data-help-context", "home");
  expect(dialog).toHaveTextContent("Upload a CSV, Excel, or JSON file");
  expect(dialog).toHaveTextContent("FACILIO in a minute");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog", { name: "Home" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("help content follows navigation while remaining distinct from Learn", async () => {
  const user = userEvent.setup();
  renderApp(["/jobs"]);
  await user.click(await screen.findByRole("button", { name: "Help" }));
  const dialog = await screen.findByRole("dialog", { name: "Activity" });
  expect(dialog).toHaveTextContent("Needs attention");
  expect(dialog).toHaveTextContent("Follow Activity");
  expect(screen.getAllByRole("link", { name: "Learn" }).length).toBeGreaterThan(0);
});

test("command palette includes Get Help without replacing Learn FACILIO", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(screen.getByRole("button", { name: "Open command palette" }));
  expect(await screen.findByRole("option", { name: "Get Help" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Learn FACILIO" })).toBeInTheDocument();
});
