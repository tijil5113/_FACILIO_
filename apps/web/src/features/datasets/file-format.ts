export function fileFormatLabel(type: string): string {
  if (type === "csv") return "CSV";
  if (type === "xlsx") return "Excel";
  if (type === "json") return "JSON";
  return type.toUpperCase();
}
