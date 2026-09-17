import { expect, test } from "vitest";

import { getApiBaseUrl } from "@/lib/config";

test("getApiBaseUrl is empty when VITE_API_BASE_URL is unset", () => {
  expect(getApiBaseUrl(undefined)).toBe("");
  expect(getApiBaseUrl("")).toBe("");
});

test("getApiBaseUrl uses the production API origin without a trailing slash", () => {
  expect(getApiBaseUrl("https://api.example.test/")).toBe("https://api.example.test");
  expect(getApiBaseUrl("https://api.example.test")).toBe("https://api.example.test");
});
