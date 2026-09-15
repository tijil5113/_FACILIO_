import type { SuggestedOperation } from "@/types/transformations";

export type ProfileStatus = "NOT_PROFILED" | "PROFILING" | "READY" | "FAILED";

export type QualityStatus = "ASSESSED" | "NOT_ASSESSED";

export type IssueSeverity = "INFO" | "WARNING" | "CRITICAL";

export type ColumnType =
  "TEXT" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "DATE" | "DATETIME" | "UNKNOWN";

export type CardinalityClass = "CONSTANT" | "LOW" | "MEDIUM" | "HIGH" | "UNIQUE";

export type QualityGrade = "Excellent" | "Good" | "Fair" | "Needs attention" | "Poor";

export interface TopValue {
  value: string;
  count: number;
  percentage: number | null;
}

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface NumericStatistics {
  count: number;
  missing: number;
  distinct: number;
  minimum: number | null;
  maximum: number | null;
  mean: number | null;
  median: number | null;
  stddev: number | null;
  percentile_25: number | null;
  percentile_75: number | null;
  zero_count: number;
  negative_count: number;
  histogram: HistogramBin[] | null;
}

export interface TextStatistics {
  min_length: number | null;
  max_length: number | null;
  avg_length: number | null;
  empty_string_count: number;
  top_values: TopValue[];
}

export interface BooleanStatistics {
  true_count: number;
  false_count: number;
  missing_count: number;
  true_percentage: number | null;
  false_percentage: number | null;
}

export interface DateStatistics {
  minimum: string | null;
  maximum: string | null;
  range_days: number | null;
  distinct_count: number;
  missing_count: number;
}

export interface ColumnProfile {
  name: string;
  position: number;
  detected_type: ColumnType;
  ingestion_dtype: string | null;
  semantic_hint: "EMAIL" | "IDENTIFIER" | null;
  row_count: number;
  non_null_count: number;
  null_count: number;
  null_percentage: number | null;
  distinct_count: number;
  distinct_percentage: number | null;
  cardinality: CardinalityClass;
  empty_string_count: number;
  whitespace_count: number;
  case_variant_value_count: number;
  invalid_email_count: number;
  potential_missing_token_count: number;
  observations: string[];
  issue_count?: number;
  numeric: NumericStatistics | null;
  text: TextStatistics | null;
  boolean: BooleanStatistics | null;
  date: DateStatistics | null;
}

export interface DatasetSummaryStats {
  row_count: number;
  column_count: number;
  total_cells: number;
  missing_cells: number;
  missing_percentage: number | null;
  complete_cells: number;
  complete_percentage: number | null;
  duplicate_rows: number;
  duplicate_percentage: number | null;
  unique_rows: number;
  memory_estimate_bytes: number | null;
  type_distribution: Record<string, number>;
  duplicate_groups: { row_indices: number[]; count: number }[];
}

export interface QualityDimension {
  key: string;
  label: string;
  score: number | null;
  status: QualityStatus;
  explanation: string;
  evidence_summary: string;
}

export interface QualitySummary {
  dataset_id: string;
  status: ProfileStatus;
  profile_version: string | null;
  profiled_at: string | null;
  stale: boolean;
  overall_score: number | null;
  overall_status: QualityStatus | null;
  grade: string | null;
  assessed_count: number;
  not_assessed_count: number;
  weighting: string | null;
  dimensions: QualityDimension[];
}

export interface IssueCounts {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export interface DatasetProfile {
  dataset_id: string;
  version_id?: string | null;
  status: ProfileStatus;
  profile_version: string | null;
  profiled_at: string | null;
  stale: boolean;
  error_code: string | null;
  error_message: string | null;
  summary: DatasetSummaryStats | null;
  columns: ColumnProfile[];
  quality: QualitySummary | null;
  issue_counts: IssueCounts;
}

export interface QualityIssue {
  id: string;
  code: string;
  category: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  column: string | null;
  affected_count: number;
  affected_percentage: number | null;
  evidence: string[];
  suggested_action: string;
  suggested_operations?: SuggestedOperation[];
}

export interface QualityIssueList {
  items: QualityIssue[];
  page: number;
  page_size: number;
  total: number;
}

export interface QualityOverviewItem {
  id: string;
  name: string;
  overall_score: number | null;
  overall_status: QualityStatus | null;
  grade: string | null;
  profiled_at: string | null;
  issue_count: number;
  profile_status: ProfileStatus;
}

export interface QualityOverview {
  datasets_total: number;
  datasets_profiled: number;
  datasets_failed: number;
  datasets_not_profiled: number;
  average_quality: number | null;
  datasets_needing_attention: number;
  recently_profiled: QualityOverviewItem[];
}
