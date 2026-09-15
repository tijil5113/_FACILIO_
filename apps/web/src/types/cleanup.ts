export type CleanupImpactLevel = "LOW" | "MODERATE" | "HIGH";
export type RecommendationKind = "actionable" | "informational";

export interface CleanupConfigurationOption {
  field: string;
  label: string;
  value: unknown;
  operation_code: string | null;
  parameters: Record<string, unknown>;
}

export interface GuidedRecommendation {
  recommendation_id: string;
  issue_id: string;
  issue_code: string;
  kind: RecommendationKind;
  title: string;
  explanation: string;
  suggested_cleanup: string;
  columns: string[];
  evidence: string[];
  affected_count: number | null;
  operation_code: string | null;
  default_parameters: Record<string, unknown>;
  options: CleanupConfigurationOption[];
  required_user_configuration: boolean;
  impact_level: CleanupImpactLevel | null;
  previewable: boolean;
  applicable: boolean;
  not_applicable_reason: string | null;
  preselected: boolean;
  execution_rank: number;
  why: string;
}

export interface CleanupRecommendations {
  dataset_id: string;
  version_id: string;
  version_number: number;
  engine_version: string;
  actionable_count: number;
  informational_count: number;
  recommendations: GuidedRecommendation[];
  selection_policy: string;
}

export interface CleanupStep {
  recommendation_id?: string | null;
  operation_code: string;
  parameters: Record<string, unknown>;
}

export interface CleanupPreviewExample {
  kind: "cell" | "row_removed" | "column_removed";
  row_index: number | null;
  column: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  step_position: number;
  operation_code: string;
  recommendation_id: string | null;
}

export interface CleanupPreviewStep {
  step_id: string;
  position: number;
  operation_code: string;
  parameters: Record<string, unknown>;
  status: string;
  impact: {
    rows_before: number;
    rows_after: number;
    columns_before: number;
    columns_after: number;
    changed_cell_count: number;
    removed_row_count: number;
    removed_column_count: number;
    affected_row_count: number;
    no_op: boolean;
  } | null;
  examples: CleanupPreviewExample[];
  warnings: string[];
  summary: string;
  duration_ms: number;
  error_code: string | null;
  error_message: string | null;
}

export interface CleanupPreview {
  dataset_id: string;
  input_version_id: string;
  input_version_number: number;
  plan_fingerprint: string;
  no_op: boolean;
  high_impact: boolean;
  rows_before: number;
  rows_after: number;
  columns_before: number;
  columns_after: number;
  changed_cell_count: number;
  removed_row_count: number;
  removed_column_count: number;
  warnings: string[];
  steps: CleanupPreviewStep[];
  examples: CleanupPreviewExample[];
  projected_quality: {
    before: number | null;
    after: number | null;
    delta: number | null;
    dimensions: Array<{
      key: string;
      label: string;
      before: number | null;
      after: number | null;
      delta: number | null;
    }>;
  } | null;
  duration_ms: number;
  expected_output: string;
}

export interface CleanupApplyResult {
  dataset_id: string;
  input_version_id: string;
  input_version_number: number;
  output_version_id: string | null;
  output_version_number: number | null;
  plan_fingerprint: string;
  impact: CleanupPreview["steps"][number]["impact"];
  quality_delta: CleanupPreview["projected_quality"];
  profile_status: string | null;
  job: {
    id: string;
    status: string;
    workflow_name: string | null;
    current_activity: string | null;
    progress: { current: number; total: number; label: string };
  };
  workflow_run: {
    id: string;
    status: string;
    quality_before: number | null;
    quality_after: number | null;
  };
  original_unchanged: boolean;
}
