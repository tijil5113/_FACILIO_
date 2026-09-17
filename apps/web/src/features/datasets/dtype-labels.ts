export function dtypeLabel(dtype: string): string {
  if (dtype === "text") return "Text";
  if (dtype === "integer") return "Integer";
  if (dtype === "decimal") return "Decimal";
  if (dtype === "boolean") return "Boolean";
  if (dtype === "datetime") return "Date and time";
  if (dtype === "unknown") return "Unknown";
  return dtype;
}

export function columnTypeLabel(type: string): string {
  if (type === "TEXT") return "Text";
  if (type === "INTEGER") return "Integer";
  if (type === "DECIMAL") return "Decimal";
  if (type === "BOOLEAN") return "Boolean";
  if (type === "DATE") return "Date";
  if (type === "DATETIME") return "Date and time";
  if (type === "UNKNOWN") return "Unknown";
  return type;
}

export function isNumericDtype(dtype: string): boolean {
  return dtype === "integer" || dtype === "decimal";
}
