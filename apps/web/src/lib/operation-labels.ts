const HUMAN_NAMES: Record<string, string> = {
  TRIM_WHITESPACE: "Remove extra spaces",
  NORMALIZE_CASE: "Make text consistent",
  FILL_MISSING: "Fill missing values",
  DROP_MISSING_ROWS: "Drop rows with missing values",
  REMOVE_DUPLICATES: "Remove duplicate rows",
  DROP_COLUMN: "Drop column",
  RENAME_COLUMN: "Rename column",
  REPLACE_VALUE: "Replace exact value",
  CAST_TYPE: "Change type",
};

export function operationDisplayName(code: string, catalogName?: string | null): string {
  const mapped = HUMAN_NAMES[code];
  if (mapped) {
    return mapped;
  }
  if (catalogName) {
    return catalogName;
  }
  return code.replaceAll("_", " ").toLowerCase();
}
