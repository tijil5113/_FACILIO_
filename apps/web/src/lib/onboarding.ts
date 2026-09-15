const STORAGE_PREFIX = "facilio.onboarding.";

export type OnboardingCue =
  "home" | "dataset" | "problems" | "history" | "cleanups" | "activity";

function storageGet(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
  } catch {
    return null;
  }
  return null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function onboardingStorageKey(cue: OnboardingCue): string {
  return `${STORAGE_PREFIX}${cue}`;
}

export function isOnboardingDismissed(cue: OnboardingCue): boolean {
  return storageGet(onboardingStorageKey(cue)) === "1";
}

export function dismissOnboarding(cue: OnboardingCue): void {
  storageSet(onboardingStorageKey(cue), "1");
}
