import { useState } from "react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { useWorkflowRunsQuery } from "@/features/workflows/queries";
import { formatCount, formatDateTime } from "@/lib/format";
import type { WorkflowRunStatus } from "@/types/workflows";

export function RunsPage() {
  const [status, setStatus] = useState<WorkflowRunStatus | "">("");
  const list = useWorkflowRunsQuery({
    status: status || undefined,
    page: 1,
    page_size: 50,
  });

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Run records"
        description="Advanced execution records for saved cleanups. Everyday progress lives in Activity."
      />
      <label className="text-xs text-ink-secondary">
        Status
        <select
          className="ml-2 h-9 rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-sm"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as WorkflowRunStatus | "");
          }}
        >
          <option value="">All</option>
          <option value="QUEUED">Queued</option>
          <option value="RUNNING">Running</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
      {list.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : list.isError ? (
        <Callout tone="danger" title="Runs unavailable">
          {list.error instanceof Error
            ? list.error.message
            : "Run history could not be loaded."}
        </Callout>
      ) : (
        <div className="overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Workflow runs</caption>
            <thead className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Run</th>
                <th className="px-4 py-2 font-medium">Workflow</th>
                <th className="px-4 py-2 font-medium">Dataset</th>
                <th className="px-4 py-2 font-medium">Versions</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Steps</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-ink-muted"
                  >
                    No run records yet
                  </td>
                </tr>
              ) : (
                list.data?.items.map((item) => (
                  <tr key={item.id} className="border-t border-line hover:bg-subtle">
                    <td className="px-4 py-3">
                      <Link
                        to={`/runs/${item.id}`}
                        className="font-mono text-xs text-ink"
                      >
                        {item.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{item.workflow_name}</td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {item.input_dataset_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      V{item.input_version_number ?? "—"}
                      {item.output_version_number
                        ? ` → V${String(item.output_version_number)}`
                        : ""}
                    </td>
                    <td className="px-4 py-3">
                      <StatusIndicator
                        label={item.status.replaceAll("_", " ")}
                        tone={
                          item.status === "SUCCEEDED"
                            ? "success"
                            : item.status === "FAILED"
                              ? "danger"
                              : item.status === "RUNNING"
                                ? "info"
                                : "neutral"
                        }
                      />
                    </td>
                    <td className="px-4 py-3">{item.step_count}</td>
                    <td className="px-4 py-3">{formatCount(item.duration_ms)} ms</td>
                    <td className="px-4 py-3">{formatDateTime(item.started_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {list.data && list.data.total > 0 ? (
        <p className="sr-only">
          <Badge>{list.data.total} runs</Badge>
        </p>
      ) : null}
    </div>
  );
}
