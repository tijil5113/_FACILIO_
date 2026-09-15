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

test("Learn appears in primary navigation and loads", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(within(applicationNav()).getByRole("link", { name: /^learn$/i }));
  expect(
    await screen.findByRole("heading", { name: "Learn FACILIO" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/know exactly what happens before you make a change/i),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Start with FACILIO in 2 minutes" }),
  ).toBeInTheDocument();
});

test("Learn appears in mobile navigation", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  const dialog = await screen.findByRole("dialog", { name: "Navigation" });
  expect(within(dialog).getByRole("link", { name: /^learn$/i })).toBeInTheDocument();
});

test("Learn is available in the command palette", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(screen.getByRole("button", { name: "Open command palette" }));
  expect(
    await screen.findByRole("option", { name: "Learn FACILIO" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Go to Learn" })).toBeInTheDocument();
  await user.click(screen.getByRole("option", { name: "Learn about versions" }));
  expect(
    await screen.findByRole("heading", { level: 2, name: "Versions and your original" }),
  ).toBeInTheDocument();
});

test("deep links open the matching Learn topic", async () => {
  renderApp(["/learn#quality"]);
  expect(
    await screen.findByRole("heading", { name: "Data quality" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Learn FACILIO" })).toBeInTheDocument();
});

test("version deep links remain on refresh", async () => {
  renderApp(["/learn#versions"]);
  expect(
    await screen.findByRole("heading", {
      level: 2,
      name: "Versions and your original",
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
});

test("Learn teaches the FACILIO journey without dominant beginner jargon", async () => {
  renderApp(["/learn"]);
  expect(
    await screen.findByRole("heading", { name: "Learn FACILIO" }),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole("heading", { name: "FACILIO in 2 minutes" }).length,
  ).toBeGreaterThan(0);
  expect(screen.getAllByText("Bring data").length).toBeGreaterThan(0);
  expect(
    screen.getByRole("heading", { level: 2, name: "Find problems" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Preview").length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "Dataset" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Original" })).toBeInTheDocument();
  expect(
    screen.getAllByRole("heading", { name: "Cleaned version" }).length,
  ).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "Cleanup" })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Follow your activity" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /pipeline/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /^job$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /workflow/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/redis/i)).not.toBeInTheDocument();
});

test("real product actions point at existing experiences", async () => {
  renderApp(["/learn"]);
  expect(
    await screen.findByRole("heading", { name: "Learn FACILIO" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Try FACILIO" })[0]).toHaveAttribute(
    "href",
    "/overview?try=1",
  );
  expect(screen.getAllByRole("link", { name: "Upload data" })[0]).toHaveAttribute(
    "href",
    "/datasets?upload=1",
  );
  expect(screen.getByRole("link", { name: "Review my datasets" })).toHaveAttribute(
    "href",
    "/datasets",
  );
  expect(screen.getAllByRole("link", { name: "Open Cleanups" })[0]).toHaveAttribute(
    "href",
    "/workflows",
  );
  expect(screen.getAllByRole("link", { name: "View Activity" })[0]).toHaveAttribute(
    "href",
    "/jobs",
  );
  expect(
    screen.getAllByRole("link", { name: "Try this with real sample data" }).length,
  ).toBeGreaterThan(0);
});

test("static educational examples are labeled Example or Illustration", async () => {
  renderApp(["/learn"]);
  expect(
    await screen.findByRole("heading", { name: "Learn FACILIO" }),
  ).toBeInTheDocument();
  const examples = screen.getAllByText("Example");
  const illustrations = screen.getAllByText("Illustration");
  expect(examples.length).toBeGreaterThanOrEqual(3);
  expect(illustrations.length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText(/fictional teaching data/i).length).toBeGreaterThan(0);
  expect(screen.queryByText("42%")).not.toBeInTheDocument();
});

test("quality explorer and before/after reveals are keyboard reachable", async () => {
  const user = userEvent.setup();
  renderApp(["/learn#quality"]);
  const integrity = await screen.findByRole("tab", { name: "Integrity" });
  await user.click(integrity);
  expect(screen.getByText(/does not pretend Integrity scored 100/i)).toBeInTheDocument();
  const reveal = screen.getByRole("button", { name: "Show what FACILIO might notice" });
  expect(reveal).toHaveAttribute("aria-expanded", "false");
  await user.click(reveal);
  expect(reveal).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(/inconsistent capitalization/i)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "After" }));
  expect(screen.getByRole("button", { name: "After" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByText("Extra spaces removed")).toBeInTheDocument();
});

test("topic navigation updates the hash destination", async () => {
  const user = userEvent.setup();
  renderApp(["/learn"]);
  const topics = await screen.findByRole("navigation", { name: "Learn topics" });
  await user.selectOptions(within(topics).getByLabelText("Topic"), "cleanups");
  expect(
    await screen.findByRole("heading", { name: "Save and reuse cleanups" }),
  ).toBeInTheDocument();
});

test("home offers a restrained Learn entry", async () => {
  renderApp(["/overview"]);
  expect(
    await screen.findByRole("link", { name: "New to FACILIO? Learn how it works" }),
  ).toHaveAttribute("href", "/learn");
  expect(screen.getByRole("button", { name: "Upload my data" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try FACILIO" })).toBeInTheDocument();
});
