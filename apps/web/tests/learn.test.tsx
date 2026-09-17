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

test("Learn appears in primary navigation and loads an overview", async () => {
  const user = userEvent.setup();
  renderApp(["/overview"]);
  await user.click(within(applicationNav()).getByRole("link", { name: /^learn$/i }));
  expect(
    await screen.findByRole("heading", { name: "Learn FACILIO" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/understand the ideas behind FACILIO/i)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Start with FACILIO in a minute" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/40% complete|lessons completed/i)).not.toBeInTheDocument();
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
    await screen.findByRole("heading", { level: 2, name: "Understand versions" }),
  ).toBeInTheDocument();
});

test("deep links open the matching Learn topic without the overview wall", async () => {
  renderApp(["/learn#quality"]);
  expect(
    await screen.findByRole("heading", { name: "Understand data quality" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Learn FACILIO" }),
  ).not.toBeInTheDocument();
});

test("version deep links remain on refresh", async () => {
  renderApp(["/learn#versions"]);
  expect(
    await screen.findByRole("heading", {
      level: 2,
      name: "Understand versions",
    }),
  ).toBeInTheDocument();
  expect(screen.getAllByText(/Viewing/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Using/i).length).toBeGreaterThan(0);
});

test("FACILIO in a minute teaches the live product journey", async () => {
  renderApp(["/learn#start"]);
  expect(
    await screen.findByRole("heading", { level: 2, name: "FACILIO in a minute" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "FACILIO in a minute" })).toHaveTextContent(
    "Bring data",
  );
  expect(screen.queryByRole("heading", { name: /pipeline/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/redis/i)).not.toBeInTheDocument();
});

test("bring data teaches supported formats and limits", async () => {
  renderApp(["/learn#bring"]);
  expect(
    await screen.findByRole("heading", { name: "Bring in your data" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/CSV, Excel, and JSON/i)).toBeInTheDocument();
  expect(screen.getByText(/16 MB/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open Datasets" })).toHaveAttribute(
    "href",
    "/datasets?upload=1",
  );
});

test("quality education does not equate score with correctness", async () => {
  renderApp(["/learn#quality"]);
  expect(
    await screen.findByRole("heading", { name: "Understand data quality" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/does not prove the data is correct for its real-world purpose/i),
  ).toBeInTheDocument();
  expect(screen.getAllByText(/Integrity is not assessed/i).length).toBeGreaterThan(0);
  expect(screen.getByText("83.3")).toBeInTheDocument();
  expect(screen.getByText("91.7")).toBeInTheDocument();
  expect(
    screen.getByText(/not a statement that the table is 91.7% correct/i),
  ).toBeInTheDocument();
});

test("problems education distinguishes informational findings", async () => {
  renderApp(["/learn#problems"]);
  expect(
    await screen.findByRole("heading", { name: "Review problems" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/not necessarily catastrophic errors/i)).toBeInTheDocument();
  expect(screen.getAllByText(/informational/i).length).toBeGreaterThan(0);
});

test("cleaning education explains composed preview", async () => {
  const user = userEvent.setup();
  renderApp(["/learn#cleaning"]);
  expect(
    await screen.findByRole("heading", { name: "Clean safely" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText(/does not silently overwrite/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/combined final result/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText("alice").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "After" }));
  expect(screen.getByText("Extra spaces removed")).toBeInTheDocument();
});

test("cleanup education teaches ordered reusable steps", async () => {
  renderApp(["/learn#cleanups"]);
  expect(
    await screen.findByRole("heading", { name: "Reuse a Cleanup" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Trim name")).toBeInTheDocument();
  expect(screen.getByText("Lowercase status")).toBeInTheDocument();
  expect(screen.getByText("Fill missing age")).toBeInTheDocument();
  expect(screen.getByText(/top to bottom/i)).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /workflow/i })).not.toBeInTheDocument();
});

test("activity education teaches partial success", async () => {
  renderApp(["/learn#activity"]);
  expect(
    await screen.findByRole("heading", { name: "Follow Activity" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Waiting")).toBeInTheDocument();
  expect(screen.getByText("Running")).toBeInTheDocument();
  expect(screen.getByText("Completed")).toBeInTheDocument();
  expect(screen.getByText("Needs attention")).toBeInTheDocument();
  expect(
    screen.getByText(
      /cleaned version may be created even if FACILIO cannot finish analyzing/i,
    ),
  ).toBeInTheDocument();
});

test("module navigation moves next and back to overview", async () => {
  const user = userEvent.setup();
  renderApp(["/learn#start"]);
  expect(
    await screen.findByRole("heading", { level: 2, name: "FACILIO in a minute" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Next: Bring in your data" }));
  expect(
    await screen.findByRole("heading", { name: "Bring in your data" }),
  ).toBeInTheDocument();
  const overviewLink = screen
    .getAllByRole("link", { name: "Learn overview" })
    .find(Boolean);
  expect(overviewLink).toBeTruthy();
  if (!overviewLink) {
    throw new Error("expected Learn overview link");
  }
  await user.click(overviewLink);
  expect(
    await screen.findByRole("heading", { name: "Learn FACILIO" }),
  ).toBeInTheDocument();
});

test("topic navigation updates the hash destination", async () => {
  const user = userEvent.setup();
  renderApp(["/learn"]);
  const topics = await screen.findByRole("navigation", { name: "Learn topics" });
  await user.selectOptions(within(topics).getByLabelText("Topic"), "cleanups");
  expect(
    await screen.findByRole("heading", { name: "Reuse a Cleanup" }),
  ).toBeInTheDocument();
});

test("quality explorer remains keyboard reachable", async () => {
  const user = userEvent.setup();
  renderApp(["/learn#quality"]);
  const integrity = await screen.findByRole("tab", { name: "Integrity" });
  await user.click(integrity);
  expect(screen.getByText(/does not pretend Integrity scored 100/i)).toBeInTheDocument();
});

test("educational examples are labeled and not presented as user data", async () => {
  renderApp(["/learn#bring"]);
  expect(await screen.findAllByText("Example")).not.toHaveLength(0);
  expect(screen.getByText(/fictional teaching data/i)).toBeInTheDocument();
});

test("home offers a restrained Learn entry", async () => {
  renderApp(["/overview"]);
  expect(
    await screen.findByRole("link", { name: "New to FACILIO? Learn how it works" }),
  ).toHaveAttribute("href", "/learn");
  expect(screen.getByRole("button", { name: "Upload your data" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try FACILIO" })).toBeInTheDocument();
});
