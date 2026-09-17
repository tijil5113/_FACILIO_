import type { QualityIssue } from "@/types/profile";

const CATEGORY_ORDER = [
  "COMPLETENESS",
  "UNIQUENESS",
  "CONSISTENCY",
  "VALIDITY",
  "STRUCTURE",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  COMPLETENESS: "Missing information",
  UNIQUENESS: "Duplicates",
  CONSISTENCY: "Consistency",
  VALIDITY: "Validity",
  STRUCTURE: "Structure",
};

const INFORMATIONAL_CODES = new Set(["HIGH_CARDINALITY", "CONSTANT_COLUMN"]);

export interface IssueGroup {
  key: string;
  label: string;
  items: QualityIssue[];
}

export function humanIssueTitle(issue: QualityIssue): string {
  if (issue.column && !issue.title.toLowerCase().includes(issue.column.toLowerCase())) {
    return `${issue.title} in ${issue.column}`;
  }
  return issue.title;
}

export function isActionableIssue(issue: QualityIssue): boolean {
  if (INFORMATIONAL_CODES.has(issue.code)) {
    return false;
  }
  return Boolean(issue.suggested_operations && issue.suggested_operations.length > 0);
}

export function issueKindLabel(issue: QualityIssue): "Actionable" | "Informational" {
  return isActionableIssue(issue) ? "Actionable" : "Informational";
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replaceAll("_", " ").toLowerCase();
}

export function groupIssues(issues: QualityIssue[]): IssueGroup[] {
  const buckets = new Map<string, QualityIssue[]>();
  for (const issue of issues) {
    const key = CATEGORY_ORDER.includes(issue.category as (typeof CATEGORY_ORDER)[number])
      ? issue.category
      : issue.category;
    const list = buckets.get(key) ?? [];
    list.push(issue);
    buckets.set(key, list);
  }
  const ordered: IssueGroup[] = [];
  for (const key of CATEGORY_ORDER) {
    const items = buckets.get(key);
    if (items && items.length > 0) {
      ordered.push({ key, label: categoryLabel(key), items });
      buckets.delete(key);
    }
  }
  for (const [key, items] of buckets) {
    ordered.push({ key, label: categoryLabel(key), items });
  }
  return ordered;
}

export function affectedCountLabel(
  affected: number,
  rowCount: number | null | undefined,
): string {
  if (rowCount != null && rowCount > 0) {
    return `${affected.toLocaleString()} of ${rowCount.toLocaleString()} rows`;
  }
  return `${affected.toLocaleString()} ${affected === 1 ? "row" : "rows"}`;
}
