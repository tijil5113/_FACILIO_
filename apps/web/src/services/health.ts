import { apiGet } from "@/services/api-client";
import type { HealthData, ReadinessData } from "@/types/api";
import { ApiClientError } from "@/types/api";

export function fetchHealth(): Promise<HealthData> {
  return apiGet<HealthData>("/api/v1/health");
}

export async function fetchReadiness(): Promise<ReadinessData> {
  try {
    return await apiGet<ReadinessData>("/api/v1/readiness");
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "NOT_READY") {
      const details = error.details;
      if (isReadinessData(details)) {
        return details;
      }
    }
    throw error;
  }
}

function isReadinessData(value: unknown): value is ReadinessData {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "status" in value && "checks" in value;
}
