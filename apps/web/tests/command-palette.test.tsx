import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

test("command palette opens from the context bar and navigates", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(screen.getByRole("button", { name: "Open command palette" }));
  expect(
    await screen.findByRole("dialog", { name: "Command palette" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("option", { name: "Open Datasets" }));
  expect(await screen.findByRole("heading", { name: "Datasets" })).toBeInTheDocument();
});

test("command palette filters commands and supports keyboard run", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(screen.getByRole("button", { name: "Open command palette" }));
  const search = await screen.findByLabelText("Commands");
  await user.type(search, "settings");
  expect(screen.getByRole("option", { name: "Go to Settings" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Open Datasets" })).not.toBeInTheDocument();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
});

test("command palette closes on escape", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(screen.getByRole("button", { name: "Open command palette" }));
  expect(
    await screen.findByRole("dialog", { name: "Command palette" }),
  ).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("dialog", { name: "Command palette" }),
  ).not.toBeInTheDocument();
});

test("meta+k toggles the command palette", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.keyboard("{Meta>}k{/Meta}");
  expect(
    await screen.findByRole("dialog", { name: "Command palette" }),
  ).toBeInTheDocument();
  await user.keyboard("{Meta>}k{/Meta}");
  expect(
    screen.queryByRole("dialog", { name: "Command palette" }),
  ).not.toBeInTheDocument();
});

test("ctrl+k opens the command palette", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.keyboard("{Control>}k{/Control}");
  expect(
    await screen.findByRole("dialog", { name: "Command palette" }),
  ).toBeInTheDocument();
});
