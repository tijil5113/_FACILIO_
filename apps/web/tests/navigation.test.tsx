import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

function applicationNav() {
  return screen.getByRole("navigation", { name: "Application" });
}

test("primary navigation reaches datasets", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(within(applicationNav()).getByRole("link", { name: /datasets/i }));
  expect(await screen.findByRole("heading", { name: "Datasets" })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /upload (your )?data/i }),
  ).toBeInTheDocument();
});

test("primary navigation reaches learn", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(within(applicationNav()).getByRole("link", { name: /^learn$/i }));
  expect(
    await screen.findByRole("heading", { name: "Learn FACILIO" }),
  ).toBeInTheDocument();
});

test("secondary navigation reaches settings", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(within(applicationNav()).getByRole("link", { name: /settings/i }));
  expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
  expect(screen.getByText(/local interface preferences/i)).toBeInTheDocument();
});

test("cleanups route shows a real catalog empty state", async () => {
  renderApp(["/workflows"]);
  expect(await screen.findByRole("heading", { name: "Cleanups" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "New Cleanup" })).toBeInTheDocument();
  expect(screen.queryByText("Product preview")).not.toBeInTheDocument();
});

test("activity navigation is marked current", async () => {
  renderApp(["/jobs"]);
  const activity = await within(applicationNav()).findByRole("link", {
    name: /activity/i,
  });
  expect(activity).toHaveAttribute("aria-current", "page");
});

test("runs remains reachable without primary navigation", async () => {
  renderApp(["/runs"]);
  expect(await screen.findByRole("heading", { name: "Run records" })).toBeInTheDocument();
  expect(
    within(applicationNav()).queryByRole("link", { name: /^runs$/i }),
  ).not.toBeInTheDocument();
});

test("sidebar collapse hides labels and keeps accessible names", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
  expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
  expect(
    within(applicationNav()).getByRole("link", { name: /home/i }),
  ).toBeInTheDocument();
});
