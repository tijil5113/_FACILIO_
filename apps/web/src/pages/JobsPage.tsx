import { useState } from "react";
import { Link } from "react-router";

import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { useJobsQuery } from "@/features/jobs/queries";
import { FirstUseCue } from "@/features/onboarding/FirstUseCue";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { formatDateTime, formatDuration } from "@/lib/format";
import { jobStatusLabel } from "@/lib/status-labels";
import type { JobStatus, JobSummary } from "@/types/jobs";
import { isActiveJobStatus } from "@/types/jobs";

const filters: { id: JobStatus | ""; label: string }[] = [
  { id: "", label: "All" },
  { id: "QUEUED", label: "Waiting to start" },
  { id: "RUNNING", label: "Running" },
  { id: "SUCCEEDED", label: "Done" },
  { id: "FAILED", label: "Couldn't finish" },
  { id: "CANCELLED", label: "Cancelled" },
];

const statusTone: Record<
  JobStatus,
  "success" | "danger" | "warning" | "info" | "neutral"
> = {
  QUEUED: "neutral",
  RUNNING: "info",
  SUCCEEDED: "success",
  FAILED: "danger",
  CANCEL_REQUESTED: "warning",
  CANCELLED: "warning",
};

export function JobsPage() {
  const [status, setStatus] = useState<JobStatus | "">("");
  const [search, setSearch] = useState("");
  const list = useJobsQuery({
    status: status || undefined,
    q: search.trim() || undefined,
    page: 1,
    page_size: 50,
  });

  return (
    <div className="page-enter mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Activity"
        description="See whether a cleanup finished, is still running, or needs attention."
      />
      <p>
        <LearnMoreLink to="/learn#activity">What does Activity show?</LearnMoreLink>
      </p>
      <FirstUseCue cue="activity" title="Activity">
        Activity shows what happened when a cleanup ran.
      </FirstUseCue>
      <div className="flex flex-wrap items-end gap-3">
        <div
          role="group"
          aria-label="Activity status filters"
          className="flex flex-wrap gap-1"
        >
          {filters.map((item) => (
            <button
              key={item.id || "all"}
              type="button"
              className={`rounded-[var(--facilio-radius-sm)] px-2.5 py-1 text-xs ${
                status === item.id ? "bg-ink text-canvas" : "border border-line text-ink"
              }`}
              aria-pressed={status === item.id}
              onClick={() => {
                setStatus(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="text-xs text-ink-secondary">
          Search
          <input
            className="ml-2 h-9 w-56 rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-sm"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Cleanup or dataset"
          />
        </label>
      </div>
      {list.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : list.isError ? (
        <RecoveryMessage
          experience={mapRecoveryError(list.error, {
            operation: "load",
            action: "Load activity",
          })}
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--facilio-radius-md)] border border-line md:overflow-visible">
          <table className="stack-table w-full text-left text-sm md:min-w-[720px]">
            <caption className="sr-only">Cleanup activity</caption>
            <thead className="bg-subtle text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Cleanup</th>
                <th className="px-4 py-2 font-medium">Dataset</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Progress</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.items ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-ink-muted"
                  >
                    {status || search.trim()
                      ? "No activity matches these filters."
                      : "No activity yet"}
                  </td>
                </tr>
              ) : (
                list.data?.items.map((item) => (
                  <tr key={item.id} className="border-t border-line hover:bg-subtle">
                    <td data-label="Cleanup" className="px-4 py-3 font-medium">
                      <Link to={`/jobs/${item.id}`} className="text-ink hover:underline">
                        {item.workflow_name ?? "Cleanup"}
                      </Link>
                    </td>
                    <td data-label="Dataset" className="px-4 py-3">
                      {item.dataset_name ?? "—"}
                    </td>
                    <td data-label="Status" className="px-4 py-3">
                      <ActivityStatus item={item} />
                    </td>
                    <td
                      data-label="Progress"
                      className="px-4 py-3 tabular-nums text-ink-secondary"
                    >
                      {item.progress.label}
                    </td>
                    <td data-label="Time" className="px-4 py-3 tabular-nums">
                      {item.execution_ms != null
                        ? formatDuration(item.execution_ms)
                        : formatDateTime(item.queued_at)}
                    </td>
                    <td data-label="Result" className="px-4 py-3 text-ink-secondary">
                      {jobResult(item)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function jobResult(item: JobSummary): string {
  if (item.status === "SUCCEEDED") {
    return item.output_version_number
      ? `V${String(item.output_version_number)} created`
      : "Done";
  }
  if (item.status === "FAILED") {
    return "No new version";
  }
  if (item.status === "CANCELLED") {
    return "Stopped";
  }
  return "—";
}

function ActivityStatus({ item }: { item: JobSummary }) {
  return (
    <span className="inline-flex items-center gap-2">
      <StatusIndicator
        label={jobStatusLabel(item.status)}
        tone={statusTone[item.status]}
        compact
        pulse={isActiveJobStatus(item.status)}
      />
    </span>
  );
}
