import { operationDisplayName } from "@/lib/operation-labels";
import type { TransformationDefinition } from "@/types/transformations";
import type { WorkflowStep } from "@/types/workflows";

const PICKER_DESCRIPTIONS: Record<string, string> = {
  TRIM_WHITESPACE: "Remove spaces before and after text.",
  NORMALIZE_CASE: "Change text to lowercase, uppercase, or title case.",
  REPLACE_VALUE: "Replace an exact text value with another value.",
  FILL_MISSING: "Fill missing values using a supported strategy.",
  DROP_MISSING_ROWS: "Remove rows that contain missing values.",
  REMOVE_DUPLICATES: "Remove exact duplicate rows.",
  RENAME_COLUMN: "Rename a column in the cleaned version.",
  DROP_COLUMN: "Remove a column from the cleaned version.",
  CAST_TYPE: "Change a column to a supported type.",
};

const CATEGORY_ORDER = ["CLEAN_TEXT", "MISSING_DATA", "ROWS", "COLUMNS"] as const;

export function transformationPickerDescription(
  definition: TransformationDefinition,
): string {
  return PICKER_DESCRIPTIONS[definition.code] ?? definition.description;
}

export function humanCategoryLabel(category: string): string {
  if (category === "CLEAN_TEXT") {
    return "Text";
  }
  if (category === "MISSING_DATA") {
    return "Missing values";
  }
  if (category === "ROWS") {
    return "Rows";
  }
  if (category === "COLUMNS") {
    return "Columns";
  }
  if (category === "TYPES") {
    return "Types";
  }
  return category.replaceAll("_", " ").toLowerCase();
}

export function groupedCatalog(items: TransformationDefinition[]) {
  const groups: { key: string; label: string; items: TransformationDefinition[] }[] = [];
  const seen = new Set<string>();
  for (const key of CATEGORY_ORDER) {
    const grouped = items.filter((item) => item.category === key);
    if (grouped.length > 0) {
      groups.push({ key, label: humanCategoryLabel(key), items: grouped });
      seen.add(key);
    }
  }
  for (const item of items) {
    if (seen.has(item.category)) {
      continue;
    }
    const grouped = items.filter((entry) => entry.category === item.category);
    groups.push({
      key: item.category,
      label: humanCategoryLabel(item.category),
      items: grouped,
    });
    seen.add(item.category);
  }
  return groups;
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return null;
}

function strategyPhrase(strategy: string, value: unknown): string {
  if (strategy === "median") {
    return "the median";
  }
  if (strategy === "mean") {
    return "the mean";
  }
  if (strategy === "constant") {
    const constant = asText(value);
    return constant ? `"${constant}"` : "a constant";
  }
  return strategy.replaceAll("_", " ");
}

function casePhrase(mode: string): string {
  if (mode === "lowercase") {
    return "lowercase";
  }
  if (mode === "uppercase") {
    return "uppercase";
  }
  if (mode === "title") {
    return "title case";
  }
  return mode.replaceAll("_", " ");
}

export function humanStepLabel(
  operationCode: string,
  parameters: Record<string, unknown> = {},
  catalogName?: string | null,
): string {
  const column = asText(parameters.column);
  const newName = asText(parameters.new_name) ?? asText(parameters.new_column);
  const find = asText(parameters.find) ?? asText(parameters.match);
  const replace = asText(parameters.replace) ?? asText(parameters.value);
  const dtype = asText(parameters.dtype) ?? asText(parameters.target_type);
  const mode = asText(parameters.mode);
  const strategy = asText(parameters.strategy);
  const how = asText(parameters.how);

  if (operationCode === "TRIM_WHITESPACE") {
    return column
      ? `Remove extra spaces from ${column}`
      : "Remove extra spaces from text";
  }
  if (operationCode === "NORMALIZE_CASE") {
    const phrase = mode ? casePhrase(mode) : "consistent capitalization";
    return column
      ? `Standardize ${column} to ${phrase}`
      : `Standardize text to ${phrase}`;
  }
  if (operationCode === "FILL_MISSING") {
    const filled = strategy ? strategyPhrase(strategy, parameters.value) : "a strategy";
    return column
      ? `Fill missing ${column} values with ${filled}`
      : `Fill missing values with ${filled}`;
  }
  if (operationCode === "DROP_MISSING_ROWS") {
    if (column) {
      return `Drop rows with missing ${column} values`;
    }
    if (how === "all") {
      return "Drop rows that are completely missing";
    }
    return "Drop rows with missing values";
  }
  if (operationCode === "REMOVE_DUPLICATES") {
    const columns = Array.isArray(parameters.columns)
      ? parameters.columns.filter((item): item is string => typeof item === "string")
      : [];
    if (columns.length === 1) {
      const only = columns[0];
      return only
        ? `Remove exact duplicate rows using ${only}`
        : "Remove exact duplicate rows";
    }
    if (columns.length > 1) {
      return `Remove exact duplicate rows using ${String(columns.length)} columns`;
    }
    return "Remove exact duplicate rows";
  }
  if (operationCode === "DROP_COLUMN") {
    return column ? `Drop column ${column}` : "Drop a column";
  }
  if (operationCode === "RENAME_COLUMN") {
    if (column && newName) {
      return `Rename ${column} to ${newName}`;
    }
    return column ? `Rename ${column}` : "Rename a column";
  }
  if (operationCode === "REPLACE_VALUE") {
    if (column && find != null) {
      return `Replace ${find} in ${column}${replace != null ? ` with ${replace}` : ""}`;
    }
    return column ? `Replace a value in ${column}` : "Replace an exact value";
  }
  if (operationCode === "CAST_TYPE") {
    if (column && dtype) {
      return `Change ${column} to ${dtype.toLowerCase()}`;
    }
    return column ? `Change the type of ${column}` : "Change a column type";
  }
  const fallback = operationDisplayName(operationCode, catalogName);
  return column ? `${fallback} on ${column}` : fallback;
}

export function humanStepFromWorkflow(
  step: Pick<WorkflowStep, "operation_code" | "parameters">,
  catalogName?: string | null,
): string {
  return humanStepLabel(step.operation_code, step.parameters, catalogName);
}

export function stepConfigSummary(parameters: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const column = asText(parameters.column);
  const mode = asText(parameters.mode);
  const strategy = asText(parameters.strategy);
  if (column) {
    parts.push(column);
  }
  if (mode) {
    parts.push(casePhrase(mode));
  }
  if (strategy) {
    parts.push(strategyPhrase(strategy, parameters.value));
  }
  if (Array.isArray(parameters.columns) && parameters.columns.length > 0) {
    parts.push(`${String(parameters.columns.length)} columns`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
