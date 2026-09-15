import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

test("unknown routes render the not-found page", async () => {
  renderApp(["/this-route-does-not-exist"]);
  expect(await screen.findByText("Page not found")).toBeInTheDocument();
});

test("not-found page returns to home", async () => {
  const user = userEvent.setup();
  renderApp(["/missing"]);
  await user.click(await screen.findByRole("link", { name: /return to home/i }));
  expect(
    await screen.findByText("Turn messy data into data you can understand and trust."),
  ).toBeInTheDocument();
});
