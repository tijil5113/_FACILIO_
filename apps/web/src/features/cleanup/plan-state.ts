import { operationDisplayName } from "@/lib/operation-labels";
import type { CleanupStep, GuidedRecommendation } from "@/types/cleanup";

export interface PlanSelection {
  selected: boolean;
  operation_code: string;
  parameters: Record<string, unknown>;
}

export function initialSelections(
  recommendations: GuidedRecommendation[],
  focusId?: string | null,
): Record<string, PlanSelection> {
  const next: Record<string, PlanSelection> = {};
  for (const item of recommendations) {
    if (item.kind !== "actionable" || !item.operation_code) {
      continue;
    }
    const focused = Boolean(focusId) && item.recommendation_id === focusId;
    next[item.recommendation_id] = {
      selected: focusId ? focused : item.preselected && item.applicable,
      operation_code: item.operation_code,
      parameters: { ...item.default_parameters },
    };
  }
  return next;
}

const OPERATION_ORDER: Record<string, number> = {
  TRIM_WHITESPACE: 10,
  REPLACE_VALUE: 15,
  NORMALIZE_CASE: 20,
  FILL_MISSING: 30,
  CAST_TYPE: 40,
  REMOVE_DUPLICATES: 50,
  DROP_MISSING_ROWS: 60,
  RENAME_COLUMN: 70,
  DROP_COLUMN: 80,
};

export function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

export function selectedSteps(
  recommendations: GuidedRecommendation[],
  selections: Record<string, PlanSelection>,
): CleanupStep[] {
  return recommendations
    .filter((item) => selections[item.recommendation_id]?.selected)
    .map((item) => {
      const selection = selections[item.recommendation_id];
      return {
        recommendation_id: item.recommendation_id,
        operation_code: selection?.operation_code ?? item.operation_code ?? "",
        parameters: { ...(selection?.parameters ?? item.default_parameters) },
      };
    })
    .filter((item) => item.operation_code)
    .sort((left, right) => {
      const leftRank = OPERATION_ORDER[left.operation_code] ?? 500;
      const rightRank = OPERATION_ORDER[right.operation_code] ?? 500;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return asText(left.parameters.column).localeCompare(
        asText(right.parameters.column),
      );
    });
}

export function detectConflicts(steps: CleanupStep[]): Record<string, string> {
  const conflicts: Record<string, string> = {};
  const caseModes = new Map<string, { id: string; mode: string }>();
  const fillColumns = new Map<string, string>();
  for (const step of steps) {
    const column = asText(step.parameters.column);
    const id = step.recommendation_id ?? "";
    if (step.operation_code === "NORMALIZE_CASE" && column) {
      const mode = asText(step.parameters.mode, "lowercase");
      const previous = caseModes.get(column);
      if (previous && previous.mode !== mode) {
        const message = `FACILIO cannot make ${column} both ${previous.mode} and ${mode}. Choose one capitalization.`;
        conflicts[previous.id] = message;
        if (id) {
          conflicts[id] = message;
        }
      }
      if (id) {
        caseModes.set(column, { id, mode });
      }
    }
    if (step.operation_code === "FILL_MISSING" && column && id) {
      fillColumns.set(column, id);
    }
    if (step.operation_code === "DROP_MISSING_ROWS") {
      const names = Array.isArray(step.parameters.columns)
        ? step.parameters.columns.map((name) => asText(name))
        : [column];
      for (const name of names) {
        const fillId = fillColumns.get(name);
        if (fillId) {
          const message = `FACILIO cannot fill missing values in ${name} and also drop those rows in the same cleanup.`;
          conflicts[fillId] = message;
          if (id) {
            conflicts[id] = message;
          }
        }
      }
    }
  }
  return conflicts;
}

export function stepNeedsValue(step: CleanupStep): boolean {
  return (
    step.operation_code === "FILL_MISSING" &&
    step.parameters.strategy === "constant" &&
    !("value" in step.parameters)
  );
}

export function humanStep(
  step: CleanupStep,
  recommendation?: GuidedRecommendation,
): string {
  const column = asText(
    step.parameters.column ??
      (Array.isArray(step.parameters.columns) ? step.parameters.columns[0] : "") ??
      recommendation?.columns[0],
  );
  const name = operationDisplayName(step.operation_code);
  if (step.operation_code === "NORMALIZE_CASE") {
    const mode = asText(step.parameters.mode, "lowercase");
    const label =
      mode === "uppercase" ? "UPPERCASE" : mode === "title" ? "Title Case" : "lowercase";
    return column ? `make ${column} ${label}` : `make text ${label}`;
  }
  if (step.operation_code === "FILL_MISSING") {
    const strategy = asText(step.parameters.strategy, "constant");
    if (strategy === "constant") {
      return column
        ? `fill missing ${column} with a chosen value`
        : "fill missing values with a chosen value";
    }
    return column ? `fill missing ${column} with the ${strategy}` : name;
  }
  if (step.operation_code === "DROP_MISSING_ROWS") {
    return column ? `drop rows where ${column} is missing` : name;
  }
  if (column) {
    return `${name.toLowerCase()} in ${column}`;
  }
  return name.toLowerCase();
}

export function impactLabel(level: string | null): string | null {
  if (level === "LOW") return "Low impact";
  if (level === "MODERATE") return "Moderate impact";
  if (level === "HIGH") return "High impact";
  return null;
}
