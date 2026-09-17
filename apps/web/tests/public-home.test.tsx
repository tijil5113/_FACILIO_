import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { PREFERENCES_STORAGE_KEY } from "@/lib/preferences";
import { usePreferencesStore } from "@/stores/preferences-store";
import {
  EXAMPLE_DISCLAIMER,
  PUBLIC_HEADLINE,
  PUBLIC_PRIMARY_CTA,
  PUBLIC_SECONDARY_CTA,
  PUBLIC_SUPPORT,
} from "@/features/public/public-content";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
});

test("public home is the landing route and keeps application home separate", async () => {
  renderApp(["/"]);
  expect(
    await screen.findByRole("heading", { level: 1, name: /Understand messy data/i }),
  ).toBeInTheDocument();
  expect(screen.getByText(PUBLIC_SUPPORT)).toBeInTheDocument();
  expect(PUBLIC_HEADLINE).toMatch(/Clean it with confidence/);
  expect(
    screen.getAllByRole("link", { name: PUBLIC_PRIMARY_CTA }).length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByRole("link", { name: PUBLIC_SECONDARY_CTA }).length,
  ).toBeGreaterThan(0);
  expect(screen.getByTestId("signature-scene")).toHaveAccessibleName(/example/i);
  expect(screen.getAllByText(EXAMPLE_DISCLAIMER).length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "How FACILIO works" })).toBeInTheDocument();
  expect(screen.getByText("See the change before you make it.")).toBeInTheDocument();
  expect(screen.getByText("V1 Original")).toBeInTheDocument();
  expect(screen.getByText("V2 Cleaned")).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Application" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Hours saved")).not.toBeInTheDocument();
  expect(screen.queryByText(/trusted by/i)).not.toBeInTheDocument();
  expect(screen.queryByText("42%")).not.toBeInTheDocument();
});

test("public home CTAs enter the application and sample path", async () => {
  const user = userEvent.setup();
  renderApp(["/"]);
  await screen.findByRole("heading", { level: 1, name: /Understand messy data/i });
  const openFacilio = screen.getAllByRole("link", { name: PUBLIC_PRIMARY_CTA })[0];
  if (!openFacilio) {
    throw new Error("Open FACILIO was missing");
  }
  await user.click(openFacilio);
  expect(
    await screen.findByRole("navigation", { name: "Application" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", {
      name: "Turn messy data into data you can understand and trust.",
    }),
  ).toBeInTheDocument();
});

test("try the sample continues into application home with try intent", async () => {
  renderApp(["/"]);
  const sample = await screen.findAllByRole("link", { name: PUBLIC_SECONDARY_CTA });
  expect(sample[0]).toHaveAttribute("href", "/overview?try=1");
});

test("public navigation reaches learn, sign in, and in-page sections", async () => {
  renderApp(["/"]);
  await screen.findByRole("heading", { level: 1, name: /Understand messy data/i });
  const footer = screen.getByRole("contentinfo");
  expect(within(footer).getByRole("link", { name: "Learn" })).toHaveAttribute(
    "href",
    "/learn",
  );
  expect(within(footer).getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(document.querySelector('a[href="/#product"]')).toBeTruthy();
  expect(document.querySelector('a[href="/#how-it-works"]')).toBeTruthy();
});

test("app alias routes to application home", async () => {
  renderApp(["/app"]);
  expect(
    await screen.findByRole("navigation", { name: "Application" }),
  ).toBeInTheDocument();
});

test("public landmarks include banner, public nav, main, and contentinfo", async () => {
  renderApp(["/"]);
  await screen.findByRole("heading", { level: 1, name: /Understand messy data/i });
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
    "href",
    "#main-content",
  );
});

test("mobile public menu exposes remaining destinations", async () => {
  const user = userEvent.setup();
  renderApp(["/"]);
  await screen.findByRole("heading", { level: 1, name: /Understand messy data/i });
  expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
    "href",
    "/signup",
  );
  const openMenu = screen.queryByRole("button", { name: "Open menu" });
  if (!openMenu) {
    return;
  }
  await user.click(openMenu);
  expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("button", { name: "Close menu" })).not.toBeInTheDocument();
});

test("reduced motion shows the signature composition without animation", async () => {
  usePreferencesStore.getState().setMotion("reduced");
  renderApp(["/"]);
  const scene = await screen.findByTestId("signature-scene");
  expect(scene).toHaveAttribute("data-animate", "false");
  expect(scene).toHaveTextContent("V1");
  expect(scene).toHaveTextContent("V2");
  expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toMatch(/reduced/);
});

test("interactive example stays labelled as illustration", async () => {
  const user = userEvent.setup();
  renderApp(["/"]);
  await screen.findByRole("heading", { name: /From messy values/i });
  await user.click(screen.getByRole("radio", { name: "Problems" }));
  expect(screen.getByText("Extra spaces")).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: "After" }));
  expect(screen.getByText(/V2 exists only after approval/i)).toBeInTheDocument();
});
