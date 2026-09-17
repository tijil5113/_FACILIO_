import { expect, test } from "vitest";

import { hasAuthFieldErrors, validateAuthFields } from "@/features/auth/auth-validation";

test("requires email and password without inventing extra rules", () => {
  expect(validateAuthFields("", "")).toEqual({
    email: "Enter an email address.",
    password: "Enter a password.",
  });
  expect(validateAuthFields("not-an-email", "secret")).toEqual({
    email: "Enter a valid email address.",
  });
  expect(validateAuthFields("ada@example.com", "secret")).toEqual({});
  expect(hasAuthFieldErrors(validateAuthFields("ada@example.com", ""))).toBe(true);
});
