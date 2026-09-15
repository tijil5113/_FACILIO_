import { mapRecoveryError } from "@/features/recovery/map-error";

export function cleanupErrorCopy(error: unknown): {
  title: string;
  body: string;
  dataChanged: boolean;
} {
  const mapped = mapRecoveryError(error, {
    operation: "cleanup",
    action: "Guided cleanup",
  });
  return {
    title: mapped.title,
    body: `${mapped.explanation} ${mapped.consequence}`.trim(),
    dataChanged: false,
  };
}

export function displayCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "(blank)";
  }
  if (typeof value === "string" && value.length === 0) {
    return "(empty)";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return "(value)";
}
