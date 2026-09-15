export type HelpContextId =
  | "home"
  | "datasets"
  | "dataset"
  | "dataset-data"
  | "problems"
  | "clean"
  | "guided-cleanup"
  | "history"
  | "cleanups"
  | "cleanup-builder"
  | "activity"
  | "activity-detail"
  | "learn"
  | "settings"
  | "quality"
  | "runs"
  | "exports"
  | "generic";

export interface HelpContent {
  id: HelpContextId;
  title: string;
  summary: string;
  actions: string[];
  goodToKnow: string[];
  learnHref: string;
  learnLabel: string;
  technical?: string[];
}

function datasetTab(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("tab");
}

export function detectHelpContext(pathname: string, search = ""): HelpContextId {
  if (pathname === "/overview" || pathname === "/") {
    return "home";
  }
  if (pathname === "/datasets") {
    return "datasets";
  }
  if (pathname.startsWith("/datasets/")) {
    const tab = datasetTab(search);
    if (tab === "problems") {
      return "problems";
    }
    if (tab === "cleanup") {
      return "guided-cleanup";
    }
    if (tab === "clean") {
      return "clean";
    }
    if (tab === "history") {
      return "history";
    }
    if (tab === "data") {
      return "dataset-data";
    }
    return "dataset";
  }
  if (pathname === "/workflows") {
    return "cleanups";
  }
  if (pathname.startsWith("/workflows/")) {
    return "cleanup-builder";
  }
  if (pathname === "/jobs") {
    return "activity";
  }
  if (pathname.startsWith("/jobs/")) {
    return "activity-detail";
  }
  if (pathname === "/learn" || pathname.startsWith("/learn")) {
    return "learn";
  }
  if (pathname === "/settings") {
    return "settings";
  }
  if (pathname === "/quality") {
    return "quality";
  }
  if (pathname === "/runs" || pathname.startsWith("/runs/")) {
    return "runs";
  }
  if (pathname === "/exports") {
    return "exports";
  }
  return "generic";
}
