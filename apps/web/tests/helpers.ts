import { vi } from "vitest";

import type { HealthData, ReadinessData } from "@/types/api";
import type { DatasetListResponse } from "@/types/dataset";
import type { QualityOverview } from "@/types/profile";
import type { TransformationDefinition, WorkspaceStats } from "@/types/transformations";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "test-request-id",
    },
  });
}

export function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

export function pathnameOf(url: string): string {
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export function isDatasetsCollectionUrl(url: string): boolean {
  const path = pathnameOf(url);
  return path === "/api/v1/datasets" || path.endsWith("/api/v1/datasets");
}

export const emptyQualityOverview: QualityOverview = {
  datasets_total: 0,
  datasets_profiled: 0,
  datasets_failed: 0,
  datasets_not_profiled: 0,
  average_quality: null,
  datasets_needing_attention: 0,
  recently_profiled: [],
};

export const emptyWorkspaceStats: WorkspaceStats = {
  datasets: 0,
  derived_versions: 0,
  transformations_applied: 0,
  datasets_analyzed: 0,
  workflow_count: 0,
  workflow_run_count: 0,
  successful_run_count: 0,
  failed_run_count: 0,
  queued_job_count: 0,
  running_job_count: 0,
  failed_job_count: 0,
  user_dataset_count: 0,
  sample_dataset_count: 0,
  recent_datasets: [],
};

export const defaultTransformationCatalog: TransformationDefinition[] = [
  {
    code: "TRIM_WHITESPACE",
    display_name: "Trim whitespace",
    description: "Remove leading and trailing whitespace from string values.",
    category: "CLEAN_TEXT",
    supported_column_types: ["TEXT", "UNKNOWN"],
    dataset_level: false,
    notes: [],
    parameters: [
      {
        name: "column",
        type: "column",
        required: true,
        description: "Column to trim.",
        options: null,
        default: null,
      },
    ],
  },
  {
    code: "NORMALIZE_CASE",
    display_name: "Normalize case",
    description: "Convert non-null string values to lowercase, uppercase, or title case.",
    category: "CLEAN_TEXT",
    supported_column_types: ["TEXT", "UNKNOWN"],
    dataset_level: false,
    notes: [],
    parameters: [
      {
        name: "column",
        type: "column",
        required: true,
        description: "Column to normalize.",
        options: null,
        default: null,
      },
      {
        name: "mode",
        type: "enum",
        required: true,
        description: "Case conversion mode.",
        options: ["lowercase", "uppercase", "title"],
        default: "lowercase",
      },
    ],
  },
  {
    code: "REMOVE_DUPLICATES",
    display_name: "Remove duplicate rows",
    description: "Keep the first exact duplicate and drop later copies.",
    category: "ROWS",
    supported_column_types: [
      "TEXT",
      "INTEGER",
      "DECIMAL",
      "BOOLEAN",
      "DATE",
      "DATETIME",
      "UNKNOWN",
    ],
    dataset_level: true,
    notes: ["First occurrence is preserved."],
    parameters: [
      {
        name: "columns",
        type: "columns",
        required: false,
        description: "Columns used to detect duplicates. Empty means all columns.",
        options: null,
        default: null,
      },
    ],
  },
  {
    code: "DROP_COLUMN",
    display_name: "Drop column",
    description: "Remove a column from the new version only.",
    category: "COLUMNS",
    supported_column_types: [
      "TEXT",
      "INTEGER",
      "DECIMAL",
      "BOOLEAN",
      "DATE",
      "DATETIME",
      "UNKNOWN",
    ],
    dataset_level: false,
    notes: [],
    parameters: [
      {
        name: "column",
        type: "column",
        required: true,
        description: "Column to remove.",
        options: null,
        default: null,
      },
    ],
  },
  {
    code: "FILL_MISSING",
    display_name: "Fill missing values",
    description: "Replace true null values. Empty strings are not treated as missing.",
    category: "MISSING_DATA",
    supported_column_types: [
      "TEXT",
      "INTEGER",
      "DECIMAL",
      "BOOLEAN",
      "DATE",
      "DATETIME",
      "UNKNOWN",
    ],
    dataset_level: false,
    notes: [],
    parameters: [
      {
        name: "column",
        type: "column",
        required: true,
        description: "Column containing missing values.",
        options: null,
        default: null,
      },
      {
        name: "strategy",
        type: "enum",
        required: true,
        description: "Replacement strategy.",
        options: ["constant", "mean", "median"],
        default: "constant",
      },
      {
        name: "value",
        type: "value",
        required: false,
        description: "Constant used when strategy is constant.",
        options: null,
        default: null,
      },
    ],
  },
];

export const emptyDatasetList: DatasetListResponse = {
  items: [],
  page: 1,
  page_size: 20,
  total: 0,
  max_upload_size_mb: 16,
  supported_file_types: ["csv", "xlsx", "json"],
};

export function mockApi(options: {
  health?: HealthData | "error";
  readiness?: ReadinessData | "error" | "not_ready";
  datasets?: DatasetListResponse | "error";
  quality?: QualityOverview | "error";
  jobs?: { items: unknown[]; page: number; page_size: number; total: number } | "error";
  workflows?:
    { items: unknown[]; page: number; page_size: number; total: number } | "error";
  sample?: DatasetListResponse["items"][number] | "error";
}) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = requestUrl(input);
    const path = pathnameOf(url);
    if (path === "/api/v1/health") {
      if (options.health === "error") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "NETWORK_ERROR",
              message: "The API could not be reached.",
              details: null,
            },
          },
          503,
        );
      }
      return jsonResponse({
        success: true,
        data: options.health ?? {
          status: "healthy",
          service: "facilio-api",
          version: "0.1.0",
        },
      });
    }
    if (url.includes("/api/v1/readiness")) {
      if (options.readiness === "error") {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      if (options.readiness === "not_ready") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "NOT_READY",
              message: "One or more dependencies are not ready.",
              details: {
                status: "not_ready",
                checks: {
                  database: {
                    status: "not_configured",
                    message: "A database URL has not been configured.",
                  },
                },
              },
            },
          },
          503,
        );
      }
      return jsonResponse({
        success: true,
        data: options.readiness ?? {
          status: "ready",
          checks: {
            database: { status: "ready", message: "Database accepted a connection." },
            queue: {
              status: "not_configured",
              message: "REDIS_URL is not set. Jobs use an in-process memory queue.",
            },
          },
        },
      });
    }
    if (pathnameOf(url) === "/api/v1/transformations") {
      return jsonResponse({
        success: true,
        data: defaultTransformationCatalog,
      });
    }
    if (pathnameOf(url) === "/api/v1/workspace/summary") {
      const list =
        options.datasets && options.datasets !== "error"
          ? options.datasets
          : emptyDatasetList;
      const items = list.items;
      const sampleCount = items.filter((item) => item.is_sample).length;
      return jsonResponse({
        success: true,
        data: {
          ...emptyWorkspaceStats,
          datasets: list.total,
          user_dataset_count: Math.max(0, list.total - sampleCount),
          sample_dataset_count: sampleCount,
          recent_datasets: items.slice(0, 5),
        },
      });
    }
    if (pathnameOf(url) === "/api/v1/workflows") {
      if (options.workflows === "error") {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return jsonResponse({
        success: true,
        data: options.workflows ?? { items: [], page: 1, page_size: 20, total: 0 },
      });
    }
    if (pathnameOf(url) === "/api/v1/workflow-runs") {
      return jsonResponse({
        success: true,
        data: { items: [], page: 1, page_size: 20, total: 0 },
      });
    }
    if (pathnameOf(url) === "/api/v1/jobs") {
      if (options.jobs === "error") {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return jsonResponse({
        success: true,
        data: options.jobs ?? { items: [], page: 1, page_size: 20, total: 0 },
      });
    }
    if (pathnameOf(url) === "/api/v1/operations/health") {
      return jsonResponse({
        success: true,
        data: {
          queue: {
            status: "not_configured",
            backend: "memory",
            queued_count: 0,
            name: "workflows",
          },
          worker: {
            status: "available",
            available_count: 1,
            last_seen_at: "2026-09-15T12:00:00.000Z",
          },
          jobs: { queued: 0, running: 0, failed: 0, succeeded: 0 },
        },
      });
    }
    if (
      path.endsWith("/samples/customers/import") ||
      path.endsWith("/samples/CUSTOMER_CLEANUP/import")
    ) {
      if (options.sample === "error") {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      if (!options.sample) {
        return jsonResponse(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Not found", details: null },
          },
          404,
        );
      }
      return jsonResponse({ success: true, data: options.sample }, 201);
    }
    if (url.includes("/api/v1/quality/summary")) {
      if (options.quality === "error") {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return jsonResponse({
        success: true,
        data: options.quality ?? emptyQualityOverview,
      });
    }
    if (isDatasetsCollectionUrl(url)) {
      if (options.datasets === "error") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "NETWORK_ERROR",
              message: "The API could not be reached.",
              details: null,
            },
          },
          503,
        );
      }
      return jsonResponse({
        success: true,
        data: options.datasets ?? emptyDatasetList,
      });
    }
    return jsonResponse(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Not found", details: null },
      },
      404,
    );
  });
}
