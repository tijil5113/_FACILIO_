import { APP_VERSION } from "@/lib/config";

import type { RecoveryExperience } from "./types";

export interface DiagnosticFields {
  version: string;
  action: string;
  error?: string;
  requestId?: string;
  status?: number;
  resourceId?: string;
  time: string;
}

export function diagnosticFields(
  experience: RecoveryExperience,
  now = new Date(),
): DiagnosticFields {
  return {
    version: APP_VERSION,
    action: experience.action,
    error: experience.code,
    requestId: experience.requestId,
    status: experience.status,
    resourceId: experience.resourceId,
    time: now.toISOString(),
  };
}

export function formatDiagnostics(fields: DiagnosticFields): string {
  const lines = [
    `FACILIO ${fields.version}`,
    `Action: ${fields.action}`,
    `Error: ${fields.error ?? "UNKNOWN"}`,
    fields.requestId ? `Request ID: ${fields.requestId}` : null,
    fields.status != null && fields.status > 0 ? `HTTP: ${String(fields.status)}` : null,
    fields.resourceId ? `Resource ID: ${fields.resourceId}` : null,
    `Time: ${fields.time}`,
  ];
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export async function copyDiagnostics(experience: RecoveryExperience): Promise<string> {
  const text = formatDiagnostics(diagnosticFields(experience));
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* Clipboard may be unavailable in restricted contexts. */
  }
  return text;
}
