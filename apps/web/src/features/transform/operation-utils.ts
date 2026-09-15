import type { DatasetColumn } from "@/types/dataset";
import type { TransformationDefinition } from "@/types/transformations";

export function scalarParam(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function defaultParameters(
  definition: TransformationDefinition,
  columns: DatasetColumn[],
  current: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };
  for (const spec of definition.parameters) {
    if (next[spec.name] !== undefined) {
      continue;
    }
    if (spec.default !== null && spec.default !== undefined) {
      next[spec.name] = spec.default;
    } else if (spec.type === "column" && columns[0]) {
      next[spec.name] = columns[0].name;
    } else if (spec.type === "columns") {
      next[spec.name] = [];
    }
  }
  return next;
}

export function categoryLabel(category: string): string {
  if (category === "CLEAN_TEXT") {
    return "Clean text";
  }
  if (category === "MISSING_DATA") {
    return "Missing data";
  }
  if (category === "ROWS") {
    return "Rows";
  }
  if (category === "COLUMNS") {
    return "Columns";
  }
  return category;
}

export function groupOperations(items: TransformationDefinition[]) {
  const groups: Record<string, TransformationDefinition[]> = {};
  for (const item of items) {
    const key = item.category;
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
  }
  return groups;
}

export function stepSummary(parameters: Record<string, unknown>): string {
  const column = parameters.column;
  const mode = parameters.mode;
  const strategy = parameters.strategy;
  const parts: string[] = [];
  if (typeof column === "string" && column) {
    parts.push(column);
  }
  if (typeof mode === "string" && mode) {
    parts.push(mode);
  }
  if (typeof strategy === "string" && strategy) {
    parts.push(strategy);
  }
  if (Array.isArray(parameters.columns) && parameters.columns.length > 0) {
    parts.push(`${String(parameters.columns.length)} columns`);
  }
  return parts.join(" · ") || "All columns";
}
