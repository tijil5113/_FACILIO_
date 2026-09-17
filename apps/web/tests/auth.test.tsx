import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderApp } from "@/app/test-utils";
import { AUTH_SUBMIT_NOTICE, AUTH_UNAVAILABLE_TITLE } from "@/lib/auth-status";
import { mockApi } from "./helpers";

beforeEach(() => {
  vi.stubGlobal("fetch", mockApi({}));
  localStorage.clear();
});

test("login presents FACILIO identity and truthful unavailability", async () => {
  renderApp(["/login"]);
  expect(
    await screen.findByRole("heading", { name: "Welcome back" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Sign in to continue to FACILIO.")).toBeInTheDocument();
  expect(screen.getByText(AUTH_UNAVAILABLE_TITLE)).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  expect(screen.getByRole("link", { name: "Open FACILIO" })).toHaveAttribute(
    "href",
    "/overview",
  );
  expect(
    screen.queryByRole("navigation", { name: "Application" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /google|github|microsoft/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /forgot password/i }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/signed in/i)).not.toBeInTheDocument();
});

test("sign up collects only email and password", async () => {
  renderApp(["/signup"]);
  expect(
    await screen.findByRole("heading", { name: "Create account" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
  expect(screen.queryByLabelText(/company/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/job title/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/8 characters|special character/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
});

test("login validation is inline and associated with fields", async () => {
  const user = userEvent.setup();
  renderApp(["/login"]);
  await user.click(await screen.findByRole("button", { name: "Sign in" }));
  const email = screen.getByLabelText("Email");
  expect(email).toHaveAttribute("aria-invalid", "true");
  expect(email).toHaveAccessibleDescription("Enter an email address.");
  expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
    "Enter a password.",
  );
  expect(screen.queryByTestId("auth-submit-truth")).not.toBeInTheDocument();
});

test("valid login submit does not authenticate or store a password", async () => {
  const user = userEvent.setup();
  renderApp(["/login"]);
  await user.type(await screen.findByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "not-a-real-secret");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByTestId("auth-submit-truth")).toHaveTextContent(
    AUTH_SUBMIT_NOTICE,
  );
  expect(screen.getByTestId("auth-submit-truth")).toHaveAttribute(
    "data-auth-backend",
    "not-implemented",
  );
  expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  expect(screen.queryByText(/welcome, you’re signed in/i)).not.toBeInTheDocument();
  expect(window.localStorage.getItem("not-a-real-secret")).toBeNull();
  expect(JSON.stringify(window.localStorage)).not.toMatch(/not-a-real-secret/);
});

test("sign up submit cannot fake account creation", async () => {
  const user = userEvent.setup();
  renderApp(["/signup"]);
  await user.type(await screen.findByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "not-a-real-secret");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByTestId("auth-submit-truth")).toHaveTextContent(
    AUTH_SUBMIT_NOTICE,
  );
  expect(screen.queryByText(/account created/i)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Application" }),
  ).not.toBeInTheDocument();
});

test("password visibility toggle is labelled", async () => {
  const user = userEvent.setup();
  renderApp(["/login"]);
  const password = await screen.findByLabelText("Password");
  expect(password).toHaveAttribute("type", "password");
  await user.click(screen.getByRole("button", { name: "Show password" }));
  expect(password).toHaveAttribute("type", "text");
  await user.click(screen.getByRole("button", { name: "Hide password" }));
  expect(password).toHaveAttribute("type", "password");
});

test("auth skip link and landmarks exist", async () => {
  renderApp(["/login"]);
  await screen.findByRole("heading", { name: "Welcome back" });
  expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
    "href",
    "#main-content",
  );
  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  expect(
    screen.getByRole("complementary", { name: "Product story" }),
  ).toBeInTheDocument();
});

test("application remains usable without signing in", async () => {
  const user = userEvent.setup();
  renderApp(["/login"]);
  await user.click(await screen.findByRole("link", { name: "Open FACILIO" }));
  expect(
    await screen.findByRole("navigation", { name: "Application" }),
  ).toBeInTheDocument();
});
