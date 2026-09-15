import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { resetPreferencesStore } from "@/stores/preferences-store";
import { resetUiStore } from "@/stores/ui-store";

function resetDomStorage(): void {
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
      localStorage.clear();
    }
  } catch {
    // happy-dom may not expose a complete Storage implementation in some runs.
  }
}

afterEach(() => {
  cleanup();
  resetDomStorage();
  resetUiStore();
  resetPreferencesStore();
  document.documentElement.classList.remove("dark");
  document.documentElement.dataset.theme = "light";
  document.documentElement.dataset.motion = "full";
});
