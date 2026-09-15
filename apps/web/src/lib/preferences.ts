export const PREFERENCES_STORAGE_KEY = "facilio.preferences";

export type ThemePreference = "system" | "light" | "dark";
export type MotionPreference = "system" | "reduced" | "full";
export type ResolvedTheme = "light" | "dark";
export type ResolvedMotion = "full" | "reduced";

export interface StoredPreferences {
  theme: ThemePreference;
  sidebarCollapsed: boolean;
  motion: MotionPreference;
}

export const defaultPreferences: StoredPreferences = {
  theme: "system",
  sidebarCollapsed: false,
  motion: "system",
};

function isTheme(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isMotion(value: unknown): value is MotionPreference {
  return value === "system" || value === "reduced" || value === "full";
}

export function parseStoredPreferences(raw: string | null): StoredPreferences {
  if (!raw) {
    return defaultPreferences;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return defaultPreferences;
    }
    const record = parsed as Record<string, unknown>;
    return {
      theme: isTheme(record.theme) ? record.theme : defaultPreferences.theme,
      sidebarCollapsed:
        typeof record.sidebarCollapsed === "boolean"
          ? record.sidebarCollapsed
          : defaultPreferences.sidebarCollapsed,
      motion: isMotion(record.motion) ? record.motion : defaultPreferences.motion,
    };
  } catch {
    return defaultPreferences;
  }
}

function storageGet(key: string): string | null {
  try {
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.getItem === "function"
    ) {
      return localStorage.getItem(key);
    }
  } catch {
    return null;
  }
  return null;
}

function storageSet(key: string, value: string): void {
  try {
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.setItem === "function"
    ) {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore quota / unavailable storage; in-memory Zustand state still applies.
  }
}

export function readStoredPreferences(): StoredPreferences {
  return parseStoredPreferences(storageGet(PREFERENCES_STORAGE_KEY));
}

export function writeStoredPreferences(preferences: StoredPreferences): void {
  storageSet(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export function resolveTheme(theme: ThemePreference): ResolvedTheme {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveMotion(motion: MotionPreference): ResolvedMotion {
  if (motion === "reduced") {
    return "reduced";
  }
  if (motion === "full") {
    return "full";
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "reduced"
    : "full";
}

export function applyDocumentPreferences(preferences: StoredPreferences): void {
  const theme = resolveTheme(preferences.theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.motion = resolveMotion(preferences.motion);
}

export function nextTheme(theme: ThemePreference): ThemePreference {
  if (theme === "system") return "light";
  if (theme === "light") return "dark";
  return "system";
}

export function toggleResolvedTheme(theme: ThemePreference): ThemePreference {
  return resolveTheme(theme) === "dark" ? "light" : "dark";
}
