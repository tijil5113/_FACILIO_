import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { App } from "@/app/App";
import { renderApp } from "@/app/test-utils";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
  window.history.pushState({}, "", "/overview");
});

test("application renders the FACILIO shell", async () => {
  renderApp(["/overview"]);
  expect(
    await screen.findByText("Turn messy data into data you can understand and trust."),
  ).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Application" })).toBeInTheDocument();
});

test("App bootstrap mounts the routed workspace", async () => {
  render(<App />);
  expect(
    await screen.findByRole("navigation", { name: "Application" }),
  ).toBeInTheDocument();
});
