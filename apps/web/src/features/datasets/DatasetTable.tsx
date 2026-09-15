import { Link } from "react-router";

import { Badge } from "@/components/ui/Badge";
import { formatCount, formatDateTime, formatFileSize } from "@/lib/format";
import { datasetStatusLabel } from "@/lib/status-labels";
import type { DatasetStatus, DatasetSummary } from "@/types/dataset";

const statusTone: Record<DatasetStatus, "success" | "warning" | "danger" | "neutral"> = {
  ready: "success",
  pending: "warning",
  processing: "warning",
  failed: "danger",
};

interface DatasetTableProps {
  items: DatasetSummary[];
}

export function DatasetTable({ items }: DatasetTableProps) {
  return (
    <div className="overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Uploaded datasets</caption>
          <thead className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Rows</th>
              <th className="px-4 py-2 text-right font-medium">Columns</th>
              <th className="px-4 py-2 text-right font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Version</th>
              <th className="px-4 py-2 font-medium">Quality</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((dataset) => (
              <tr key={dataset.id} className="border-t border-line hover:bg-subtle">
                <td className="max-w-[18rem] px-4 py-3 font-medium text-ink">
                  <Link
                    to={`/datasets/${dataset.id}`}
                    className="block truncate hover:underline focus-visible:underline"
                    title={dataset.name}
                  >
                    {dataset.name}
                  </Link>
                  {dataset.is_sample ? (
                    <span className="ml-0 text-[11px] text-ink-muted">Sample</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-ink-secondary uppercase">
                  {dataset.file_type}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">
                  {formatCount(dataset.row_count)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">
                  {formatCount(dataset.column_count)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">
                  {formatFileSize(dataset.file_size)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[dataset.status]}>
                    {datasetStatusLabel(dataset.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-ink-secondary">
                  {dataset.current_version_number != null
                    ? `V${String(dataset.current_version_number)}${
                        dataset.version_count > 1
                          ? ` · ${String(dataset.version_count)} versions`
                          : ""
                      }`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">
                  {dataset.profile_status === "READY" && dataset.quality_score !== null
                    ? dataset.quality_score.toFixed(1)
                    : "Not analyzed"}
                </td>
                <td className="px-4 py-3 text-ink-secondary">
                  {formatDateTime(dataset.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
