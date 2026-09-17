import { Link } from "react-router";

import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Table } from "@/components/ui/Table";
import { fileFormatLabel } from "@/features/datasets/file-format";
import { formatCount, formatDateTime } from "@/lib/format";
import { profileStatusLabel } from "@/lib/status-labels";
import type { DatasetStatus, DatasetSummary } from "@/types/dataset";

const statusTone: Record<DatasetStatus, "success" | "warning" | "danger" | "neutral"> = {
  ready: "neutral",
  pending: "warning",
  processing: "warning",
  failed: "danger",
};

interface DatasetTableProps {
  items: DatasetSummary[];
}

export function DatasetTable({ items }: DatasetTableProps) {
  return (
    <Table caption="Datasets" className="min-w-[720px]">
      <thead>
        <tr>
          <th>Name</th>
          <th>Format</th>
          <th className="text-right">Rows</th>
          <th className="text-right">Columns</th>
          <th>Analysis</th>
          <th>Version</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {items.map((dataset) => (
          <tr key={dataset.id} data-interactive="true">
            <td className="max-w-[20rem] font-medium text-ink">
              <Link
                to={`/datasets/${dataset.id}`}
                className="block truncate hover:underline focus-visible:underline"
                title={dataset.name}
              >
                {dataset.name}
              </Link>
              {dataset.is_sample ? (
                <span className="type-meta mt-0.5 block text-ink-muted">Sample</span>
              ) : null}
            </td>
            <td className="text-ink-secondary">{fileFormatLabel(dataset.file_type)}</td>
            <td className="text-right tabular-nums">{formatCount(dataset.row_count)}</td>
            <td className="text-right tabular-nums">
              {formatCount(dataset.column_count)}
            </td>
            <td>
              {dataset.status !== "ready" ? (
                <StatusIndicator
                  label={
                    dataset.status === "failed"
                      ? "Couldn't finish"
                      : dataset.status === "processing"
                        ? "Working"
                        : "Waiting"
                  }
                  tone={statusTone[dataset.status]}
                  compact
                />
              ) : (
                <span className="text-ink-secondary">
                  {profileStatusLabel(dataset.profile_status)}
                  {dataset.profile_status === "READY" && (dataset.issue_count ?? 0) > 0
                    ? ` · ${String(dataset.issue_count)}`
                    : ""}
                </span>
              )}
            </td>
            <td className="text-ink-secondary">
              {dataset.current_version_number != null
                ? `V${String(dataset.current_version_number)}${
                    dataset.current_version_number === 1 ? " Original" : " Cleaned"
                  }`
                : "—"}
            </td>
            <td className="text-ink-secondary">{formatDateTime(dataset.updated_at)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
