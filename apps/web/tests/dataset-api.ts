import { vi } from "vitest";

import type { DatasetDetail, DatasetListResponse, DatasetPreview } from "@/types/dataset";
import type { DatasetProfile, QualityIssue } from "@/types/profile";
import {
  defaultTransformationCatalog,
  jsonResponse,
  isDatasetsCollectionUrl,
  pathnameOf,
  requestUrl,
} from "./helpers";

export const sample: DatasetDetail = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "customers",
  original_filename: "customers.csv",
  file_type: "csv",
  mime_type: "text/csv",
  file_size: 128,
  status: "ready",
  row_count: 2,
  column_count: 2,
  selected_sheet: null,
  encoding: "utf-8",
  delimiter: ",",
  created_at: "2026-09-10T12:00:00.000Z",
  updated_at: "2026-09-10T12:00:00.000Z",
  profile_status: "NOT_PROFILED",
  quality_score: null,
  quality_grade: null,
  profiled_at: null,
  current_version_id: "21111111-1111-4111-8111-111111111111",
  current_version_number: 1,
  version_count: 1,
  columns: [
    { name: "name", index: 0, dtype: "text" },
    { name: "city", index: 1, dtype: "text" },
  ],
  error_code: null,
  error_message: null,
};

export const preview: DatasetPreview = {
  dataset_id: sample.id,
  version_id: sample.current_version_id,
  version_number: 1,
  columns: sample.columns,
  rows: [
    ["Ada", null],
    ["Bob", ""],
  ],
  row_count: 2,
  column_count: 2,
  preview_row_count: 2,
  truncated_rows: false,
  truncated_columns: false,
};

export const populatedList: DatasetListResponse = {
  items: [sample],
  page: 1,
  page_size: 20,
  total: 1,
  max_upload_size_mb: 16,
  supported_file_types: ["csv", "xlsx", "json"],
};

export const readyProfile: DatasetProfile = {
  dataset_id: sample.id,
  version_id: sample.current_version_id,
  status: "READY",
  profile_version: "1.0",
  profiled_at: "2026-09-10T12:05:00.000Z",
  stale: false,
  error_code: null,
  error_message: null,
  summary: {
    row_count: 2,
    column_count: 2,
    total_cells: 4,
    missing_cells: 1,
    missing_percentage: 25,
    complete_cells: 3,
    complete_percentage: 75,
    duplicate_rows: 0,
    duplicate_percentage: 0,
    unique_rows: 2,
    memory_estimate_bytes: 128,
    type_distribution: {
      TEXT: 2,
      INTEGER: 0,
      DECIMAL: 0,
      BOOLEAN: 0,
      DATE: 0,
      DATETIME: 0,
      UNKNOWN: 0,
    },
    duplicate_groups: [],
  },
  columns: [
    {
      name: "name",
      position: 0,
      detected_type: "TEXT",
      ingestion_dtype: "text",
      semantic_hint: null,
      row_count: 2,
      non_null_count: 2,
      null_count: 0,
      null_percentage: 0,
      distinct_count: 2,
      distinct_percentage: 100,
      cardinality: "MEDIUM",
      empty_string_count: 0,
      whitespace_count: 0,
      case_variant_value_count: 0,
      invalid_email_count: 0,
      potential_missing_token_count: 0,
      observations: [],
      issue_count: 0,
      numeric: null,
      text: {
        min_length: 3,
        max_length: 3,
        avg_length: 3,
        empty_string_count: 0,
        top_values: [
          { value: "Ada", count: 1, percentage: 50 },
          { value: "Bob", count: 1, percentage: 50 },
        ],
      },
      boolean: null,
      date: null,
    },
    {
      name: "city",
      position: 1,
      detected_type: "TEXT",
      ingestion_dtype: "text",
      semantic_hint: null,
      row_count: 2,
      non_null_count: 1,
      null_count: 1,
      null_percentage: 50,
      distinct_count: 1,
      distinct_percentage: 100,
      cardinality: "MEDIUM",
      empty_string_count: 1,
      whitespace_count: 0,
      case_variant_value_count: 0,
      invalid_email_count: 0,
      potential_missing_token_count: 0,
      observations: ["MISSING_VALUES", "EMPTY_STRINGS"],
      issue_count: 1,
      numeric: null,
      text: {
        min_length: 0,
        max_length: 6,
        avg_length: 3,
        empty_string_count: 1,
        top_values: [{ value: "London", count: 1, percentage: 50 }],
      },
      boolean: null,
      date: null,
    },
  ],
  quality: {
    dataset_id: sample.id,
    status: "READY",
    profile_version: "1.0",
    profiled_at: "2026-09-10T12:05:00.000Z",
    stale: false,
    overall_score: 86.4,
    overall_status: "ASSESSED",
    grade: "Good",
    assessed_count: 4,
    not_assessed_count: 1,
    weighting: "Equal arithmetic mean of ASSESSED dimensions only.",
    dimensions: [
      {
        key: "COMPLETENESS",
        label: "Completeness",
        score: 75,
        status: "ASSESSED",
        explanation: "1 of 4 cells are missing (null/NaN).",
        evidence_summary: "3 complete cells of 4.",
      },
      {
        key: "UNIQUENESS",
        label: "Uniqueness",
        score: 100,
        status: "ASSESSED",
        explanation: "0 extra duplicate rows detected across 2 records.",
        evidence_summary: "2 unique rows of 2.",
      },
      {
        key: "VALIDITY",
        label: "Validity",
        score: null,
        status: "NOT_ASSESSED",
        explanation: "Validity is not assessed.",
        evidence_summary: "No applicable validity checks.",
      },
      {
        key: "CONSISTENCY",
        label: "Consistency",
        score: 100,
        status: "ASSESSED",
        explanation: "No case, whitespace, or mixed-representation issues were detected.",
        evidence_summary: "2 columns assessed for consistency.",
      },
      {
        key: "INTEGRITY",
        label: "Integrity",
        score: null,
        status: "NOT_ASSESSED",
        explanation: "Integrity is not assessed.",
        evidence_summary: "Relational rules are not configured.",
      },
    ],
  },
  issue_counts: { total: 1, critical: 0, warning: 0, info: 1 },
};

export const failedProfile: DatasetProfile = {
  ...readyProfile,
  status: "FAILED",
  summary: null,
  columns: [],
  quality: null,
  error_code: "PROFILING_FAILED",
  error_message: "Dataset profiling could not be completed.",
};

export const readyIssues: QualityIssue[] = [
  {
    id: "MISSING_VALUES:city",
    code: "MISSING_VALUES",
    category: "COMPLETENESS",
    severity: "INFO",
    title: "Missing values",
    description: "1 null values in city.",
    column: "city",
    affected_count: 1,
    affected_percentage: 50,
    evidence: [],
    suggested_action: "Review missing city values.",
    suggested_operations: [
      {
        code: "FILL_MISSING",
        display_name: "Fill missing values",
        reason: "Replace true nulls in this column.",
        parameters: { column: "city", strategy: "constant" },
      },
    ],
  },
];

export function mockDatasetApi(options?: {
  list?: DatasetListResponse;
  detail?: DatasetDetail | "missing";
  preview?: DatasetPreview;
  upload?: "success" | "failure" | "sheets" | "unsupported";
  rename?: "success" | "failure";
  remove?: "success";
  profile?: "missing" | "ready" | "failed";
  profileData?: DatasetProfile;
  analyze?: "success" | "failure";
  previewTransform?: "change" | "noop" | "failure";
  applyTransform?: "success" | "failure";
}) {
  let renamed = sample;
  type MockVersion = {
    id: string;
    dataset_id: string;
    version_number: number;
    parent_version_id: string | null;
    kind: "ORIGINAL" | "DERIVED";
    label: string;
    row_count: number;
    column_count: number;
    profile_status: "NOT_PROFILED" | "PROFILING" | "READY" | "FAILED";
    profiled_at: string | null;
    created_at: string;
    is_current: boolean;
    operation_code: string | null;
    operation_summary: string | null;
    created_by_workflow_run_id: string | null;
    workflow_name: string | null;
    workflow_revision: number | null;
  };
  let versions: MockVersion[] = [
    {
      id: sample.current_version_id as string,
      dataset_id: sample.id,
      version_number: 1,
      parent_version_id: null as string | null,
      kind: "ORIGINAL" as const,
      label: "Original",
      row_count: 2,
      column_count: 2,
      profile_status: "NOT_PROFILED" as const,
      profiled_at: null as string | null,
      created_at: sample.created_at,
      is_current: true,
      operation_code: null as string | null,
      operation_summary: null as string | null,
      created_by_workflow_run_id: null as string | null,
      workflow_name: null as string | null,
      workflow_revision: null as number | null,
    },
  ];
  let currentProfile: DatasetProfile | null =
    options?.profile === "ready"
      ? (options.profileData ?? readyProfile)
      : options?.profile === "failed"
        ? failedProfile
        : null;

  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const path = pathnameOf(url);

    if (url.includes("/api/v1/health")) {
      return jsonResponse({
        success: true,
        data: { status: "healthy", service: "facilio-api", version: "0.1.0" },
      });
    }
    if (url.includes("/api/v1/readiness")) {
      return jsonResponse({
        success: true,
        data: {
          status: "ready",
          checks: { database: { status: "ready", message: "ok" } },
        },
      });
    }

    if (isDatasetsCollectionUrl(url) && method === "GET") {
      return jsonResponse({ success: true, data: options?.list ?? populatedList });
    }

    if (isDatasetsCollectionUrl(url) && method === "POST") {
      const body = init?.body;
      if (body instanceof FormData && body.get("staging_id")) {
        return jsonResponse({ success: true, data: sample }, 201);
      }
      if (options?.upload === "failure") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "INVALID_CSV",
              message: "The CSV could not be parsed.",
              details: null,
            },
          },
          400,
        );
      }
      if (options?.upload === "unsupported") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "UNSUPPORTED_FILE_TYPE",
              message:
                "Supported formats are CSV (.csv), Excel (.xlsx), and JSON (.json).",
              details: null,
            },
          },
          415,
        );
      }
      if (options?.upload === "sheets") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "SHEET_SELECTION_REQUIRED",
              message: "This workbook has multiple sheets. Select one to ingest.",
              details: {
                staging_id: "22222222-2222-4222-8222-222222222222",
                original_filename: "orders.xlsx",
                file_type: "xlsx",
                file_size: 2048,
                sheets: [
                  { name: "Customers", empty: false, hidden: false },
                  { name: "Orders", empty: false, hidden: false },
                  { name: "Archive", empty: true, hidden: false },
                ],
              },
            },
          },
          409,
        );
      }
      return jsonResponse({ success: true, data: sample }, 201);
    }

    if (path === `/api/v1/datasets/${sample.id}/preview`) {
      return jsonResponse({ success: true, data: options?.preview ?? preview });
    }

    if (path === `/api/v1/datasets/${sample.id}/profile` && method === "GET") {
      if (!currentProfile) {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "PROFILE_NOT_FOUND",
              message: "This dataset has not been profiled yet.",
              details: null,
            },
          },
          404,
        );
      }
      return jsonResponse({ success: true, data: currentProfile });
    }

    if (path === `/api/v1/datasets/${sample.id}/profile` && method === "POST") {
      if (options?.analyze === "failure") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "PROFILING_FAILED",
              message: "Dataset profiling could not be completed.",
              details: null,
            },
          },
          500,
        );
      }
      currentProfile = options?.profileData ?? readyProfile;
      return jsonResponse({ success: true, data: currentProfile });
    }

    if (path === `/api/v1/datasets/${sample.id}/quality`) {
      return jsonResponse({ success: true, data: readyProfile.quality });
    }

    if (path.startsWith(`/api/v1/datasets/${sample.id}/issues`)) {
      return jsonResponse({
        success: true,
        data: {
          items: readyIssues,
          page: 1,
          page_size: 50,
          total: readyIssues.length,
        },
      });
    }

    if (path === `/api/v1/datasets/${sample.id}` && method === "GET") {
      if (options?.detail === "missing") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "DATASET_NOT_FOUND",
              message: "The requested dataset was not found.",
              details: null,
            },
          },
          404,
        );
      }
      return jsonResponse({ success: true, data: options?.detail ?? renamed });
    }

    if (path === `/api/v1/datasets/${sample.id}` && method === "PATCH") {
      if (options?.rename === "failure") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "The request failed validation.",
              details: null,
            },
          },
          422,
        );
      }
      const payload =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as { name?: string })
          : { name: "Revenue" };
      renamed = { ...sample, name: payload.name ?? "Revenue" };
      return jsonResponse({
        success: true,
        data: renamed,
      });
    }

    if (path === `/api/v1/datasets/${sample.id}` && method === "DELETE") {
      return jsonResponse({ success: true, data: { id: sample.id, deleted: true } });
    }

    if (url.includes("/api/v1/quality/summary")) {
      const profiled =
        options?.profile === "ready" ||
        Boolean(currentProfile && currentProfile.status === "READY");
      return jsonResponse({
        success: true,
        data: {
          datasets_total: 1,
          datasets_profiled: profiled ? 1 : 0,
          datasets_failed: 0,
          datasets_not_profiled: profiled ? 0 : 1,
          average_quality: profiled ? 86.4 : null,
          datasets_needing_attention: 0,
          recently_profiled: profiled
            ? [
                {
                  id: sample.id,
                  name: sample.name,
                  overall_score: 86.4,
                  overall_status: "ASSESSED",
                  grade: "Good",
                  profiled_at: readyProfile.profiled_at,
                  issue_count: 1,
                  profile_status: "READY",
                },
              ]
            : [],
        },
      });
    }

    if (path === "/api/v1/transformations") {
      return jsonResponse({ success: true, data: defaultTransformationCatalog });
    }

    if (path === "/api/v1/workspace/summary") {
      return jsonResponse({
        success: true,
        data: {
          datasets: 1,
          derived_versions: versions.length - 1,
          transformations_applied: versions.length - 1,
          datasets_analyzed: currentProfile?.status === "READY" ? 1 : 0,
          user_dataset_count: sample.is_sample ? 0 : 1,
          sample_dataset_count: sample.is_sample ? 1 : 0,
          recent_datasets: [sample],
        },
      });
    }

    if (path === `/api/v1/datasets/${sample.id}/versions` && method === "GET") {
      return jsonResponse({ success: true, data: versions });
    }

    const versionPrefix = `/api/v1/datasets/${sample.id}/versions/`;
    if (path.startsWith(versionPrefix)) {
      const rest = path.slice(versionPrefix.length);
      const [versionId, ...tail] = rest.split("/");
      const version = versions.find((item) => item.id === versionId);
      if (!versionId || !version) {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "VERSION_NOT_FOUND",
              message: "Version not found.",
              details: null,
            },
          },
          404,
        );
      }
      const action = tail.join("/");
      if (action === "preview" && method === "GET") {
        return jsonResponse({ success: true, data: options?.preview ?? preview });
      }
      if (action === "profile" && method === "GET") {
        if (!currentProfile) {
          return jsonResponse(
            {
              success: false,
              error: {
                code: "PROFILE_NOT_FOUND",
                message: "This dataset has not been profiled yet.",
                details: null,
              },
            },
            404,
          );
        }
        return jsonResponse({ success: true, data: currentProfile });
      }
      if (action === "profile" && method === "POST") {
        if (options?.analyze === "failure") {
          return jsonResponse(
            {
              success: false,
              error: {
                code: "PROFILING_FAILED",
                message: "Dataset profiling could not be completed.",
                details: null,
              },
            },
            500,
          );
        }
        currentProfile = options?.profileData ?? readyProfile;
        return jsonResponse({ success: true, data: currentProfile });
      }
      if (action === "lineage") {
        return jsonResponse({
          success: true,
          data: {
            items: versions.map((item, index) => ({
              version: item,
              transformation:
                index === 0
                  ? null
                  : {
                      id: "33333333-3333-4333-8333-333333333333",
                      dataset_id: sample.id,
                      input_version_id: versions[0]?.id,
                      output_version_id: item.id,
                      operation_code: "TRIM_WHITESPACE",
                      parameters: { column: "name" },
                      summary: "Trimmed whitespace on name.",
                      impact: {
                        rows_before: 2,
                        rows_after: 2,
                        columns_before: 2,
                        columns_after: 2,
                        changed_cell_count: 1,
                        removed_row_count: 0,
                        removed_column_count: 0,
                        affected_row_count: 1,
                        no_op: false,
                      },
                      created_at: sample.created_at,
                    },
            })),
          },
        });
      }
      if (action === "comparison") {
        if (version.kind === "ORIGINAL") {
          return jsonResponse(
            {
              success: false,
              error: {
                code: "VERSION_HAS_NO_PARENT",
                message: "The original version has no parent to compare.",
                details: null,
              },
            },
            409,
          );
        }
        return jsonResponse({
          success: true,
          data: {
            parent: versions[0],
            child: version,
            impact: {
              rows_before: 2,
              rows_after: 2,
              columns_before: 2,
              columns_after: 2,
              changed_cell_count: 1,
              removed_row_count: 0,
              removed_column_count: 0,
              affected_row_count: 1,
              no_op: false,
            },
            transformation: {
              id: "33333333-3333-4333-8333-333333333333",
              dataset_id: sample.id,
              input_version_id: versions[0]?.id,
              output_version_id: version.id,
              operation_code: "TRIM_WHITESPACE",
              parameters: { column: "name" },
              summary: "Trimmed whitespace on name.",
              impact: {
                rows_before: 2,
                rows_after: 2,
                columns_before: 2,
                columns_after: 2,
                changed_cell_count: 1,
                removed_row_count: 0,
                removed_column_count: 0,
                affected_row_count: 1,
                no_op: false,
              },
              created_at: sample.created_at,
            },
            quality_delta: {
              before: 86.4,
              after: 90.0,
              delta: 3.6,
              dimensions: [],
            },
          },
        });
      }
      if (action === "transformations/preview" && method === "POST") {
        if (options?.previewTransform === "failure") {
          return jsonResponse(
            {
              success: false,
              error: {
                code: "PREVIEW_FAILED",
                message: "The preview could not be generated.",
                details: null,
              },
            },
            400,
          );
        }
        const payload =
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as {
                operation?: string;
                parameters?: { column?: string };
              })
            : { operation: "TRIM_WHITESPACE", parameters: { column: "name" } };
        const noOp = options?.previewTransform === "noop";
        return jsonResponse({
          success: true,
          data: {
            operation: payload.operation ?? "TRIM_WHITESPACE",
            parameters: payload.parameters ?? { column: "name" },
            input_version_id: version.id,
            impact: {
              rows_before: 2,
              rows_after: 2,
              columns_before: 2,
              columns_after: 2,
              changed_cell_count: noOp ? 0 : 1,
              removed_row_count: 0,
              removed_column_count: payload.operation === "DROP_COLUMN" ? 1 : 0,
              affected_row_count: noOp ? 0 : 1,
              no_op: noOp,
            },
            examples: noOp
              ? []
              : [
                  {
                    kind: payload.operation === "DROP_COLUMN" ? "column_removed" : "cell",
                    row_index: payload.operation === "DROP_COLUMN" ? null : 0,
                    column: payload.parameters?.column ?? "name",
                    before: " Ada",
                    after: "Ada",
                    reason: null,
                  },
                ],
            warnings:
              payload.operation === "DROP_COLUMN"
                ? ["This operation will remove a column from the new version."]
                : [],
            summary: noOp ? "No values would change." : "1 value would change in name.",
            extra: {},
          },
        });
      }
      if (action === "transformations" && method === "POST") {
        if (options?.previewTransform === "noop") {
          return jsonResponse(
            {
              success: false,
              error: {
                code: "TRANSFORMATION_NOOP",
                message: "This operation would not change any values.",
                details: null,
              },
            },
            409,
          );
        }
        if (options?.applyTransform === "failure") {
          return jsonResponse(
            {
              success: false,
              error: {
                code: "TRANSFORMATION_FAILED",
                message: "The transformation could not be applied.",
                details: null,
              },
            },
            500,
          );
        }
        const newVersion = {
          id: "31111111-1111-4111-8111-111111111111",
          dataset_id: sample.id,
          version_number: 2,
          parent_version_id: version.id,
          kind: "DERIVED" as const,
          label: "Trim whitespace",
          row_count: 2,
          column_count: 2,
          profile_status: "READY" as const,
          profiled_at: readyProfile.profiled_at,
          created_at: sample.updated_at,
          is_current: true,
          operation_code: "TRIM_WHITESPACE",
          operation_summary: "Trimmed whitespace on name.",
          created_by_workflow_run_id: null,
          workflow_name: null,
          workflow_revision: null,
        };
        versions = versions
          .map((item) => ({ ...item, is_current: false }))
          .concat(newVersion);
        return jsonResponse(
          {
            success: true,
            data: {
              version: { ...newVersion, columns: sample.columns },
              transformation_id: "33333333-3333-4333-8333-333333333333",
              summary: "Trimmed whitespace on name.",
              impact: {
                rows_before: 2,
                rows_after: 2,
                columns_before: 2,
                columns_after: 2,
                changed_cell_count: 1,
                removed_row_count: 0,
                removed_column_count: 0,
                affected_row_count: 1,
                no_op: false,
              },
              profile_status: "READY",
              quality_delta: { before: 86.4, after: 90.0, delta: 3.6, dimensions: [] },
            },
          },
          201,
        );
      }
      if (action === "" && method === "GET") {
        return jsonResponse({
          success: true,
          data: { ...version, columns: sample.columns },
        });
      }
    }

    if (path === `/api/v1/datasets/${sample.id}/current-version` && method === "PATCH") {
      return jsonResponse({
        success: true,
        data: { ...versions[0], columns: sample.columns, is_current: true },
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
