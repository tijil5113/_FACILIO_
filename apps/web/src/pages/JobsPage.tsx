import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { groupActivityByDate } from "@/features/jobs/activity-groups";
import { useJobsQuery, useOperationsHealthQuery } from "@/features/jobs/queries";
import { FirstUseCue } from "@/features/onboarding/FirstUseCue";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { activityOutcome } from "@/lib/activity-outcome";
import { formatRelativeTime } from "@/lib/format";
import type { JobStatus, JobSummary } from "@/types/jobs";

const filters: { id: JobStatus | ""; label: string }[] = [
  { id: "", label: "All" },
  { id: "QUEUED", label: "Waiting" },
  { id: "RUNNING", label: "Running" },
  { id: "SUCCEEDED", label: "Completed" },
  { id: "FAILED", label: "Needs attention" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function JobsPage() {
  const [status, setStatus] = useState<JobStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const operations = useOperationsHealthQuery();
  const list = useJobsQuery({
    status: status || undefined,
    q: search.trim() || undefined,
    page,
    page_size: 20,
  });
  const workerAvailable = operations.data
    ? operations.data.worker.status === "available"
    : true;
  const items = list.data?.items ?? [];
  const groups = groupActivityByDate(
    items,
    (item) => item.completed_at ?? item.started_at ?? item.queued_at,
  );
  const filteredEmpty = Boolean(status || search.trim()) && items.length === 0;
  const trueEmpty = !status && !search.trim() && list.data?.total === 0;

  return (
    <div className="page-enter mx-auto content-page space-y-6">
      <PageHeader
        title="Activity"
        description="See recent cleaning and processing activity across FACILIO."
      />
      <p>
        <LearnMoreLink to="/learn#activity">What does Activity show?</LearnMoreLink>
      </p>
      <FirstUseCue cue="activity" title="Activity">
        Activity shows what happened when a Cleanup ran, and whether a version was
        created.
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
                setPage(1);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="min-w-[12rem] flex-1">
          <Input
            id="activity-search"
            label="Search"
            value={search}
            placeholder="Cleanup or dataset"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      {list.isLoading ? (
        <TableSkeleton rows={6} />
      ) : list.isError ? (
        <RecoveryMessage
          experience={mapRecoveryError(list.error, {
            operation: "load",
            action: "Load activity",
          })}
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void list.refetch();
              }}
            >
              Try again
            </Button>
          }
        />
      ) : trueEmpty ? (
        <div>
          <p className="type-body text-ink">No activity yet</p>
          <p className="type-body mt-1 text-ink-muted">
            Cleaning and processing activity will appear here.
          </p>
        </div>
      ) : filteredEmpty ? (
        <p className="type-body text-ink-muted">No activity matches these filters.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.id}
              className="activity-group"
              aria-labelledby={`activity-${group.id}`}
            >
              {groups.length > 1 ? (
                <h2 id={`activity-${group.id}`} className="type-meta mb-2 text-ink-muted">
                  {group.label}
                </h2>
              ) : (
                <h2 id={`activity-${group.id}`} className="sr-only">
                  {group.label}
                </h2>
              )}
              <ul className="overflow-hidden rounded-[var(--facilio-radius-md)] border border-line bg-surface">
                {group.items.map((item) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    workerAvailable={workerAvailable}
                  />
                ))}
              </ul>
            </section>
          ))}
          {list.data && list.data.total > list.data.page_size ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((value) => value - 1);
                }}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * list.data.page_size >= list.data.total}
                onClick={() => {
                  setPage((value) => value + 1);
                }}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  item,
  workerAvailable,
}: {
  item: JobSummary;
  workerAvailable: boolean;
}) {
  const outcome = activityOutcome(item, { workerAvailable });
  const pulse = outcome.kind === "running" || outcome.kind === "waiting";
  const version =
    item.output_version_number != null ? `V${String(item.output_version_number)}` : null;

  return (
    <li className="activity-item">
      <Link
        to={`/jobs/${item.id}`}
        className="min-w-0 font-medium text-ink hover:underline"
      >
        {item.workflow_name ?? "Cleanup"}
      </Link>
      <span className="truncate text-sm text-ink-secondary">
        {item.dataset_name ?? "—"}
      </span>
      <span className="min-w-0">
        <StatusIndicator
          label={outcome.headline}
          tone={outcome.tone}
          compact
          pulse={pulse}
        />
        {outcome.kind === "partial_success" ? (
          <span className="type-caption mt-0.5 block text-warning">
            Analysis needs attention
          </span>
        ) : null}
      </span>
      <span className="text-sm text-ink-secondary">{version ?? "—"}</span>
      <span className="type-caption text-ink-muted">
        {formatRelativeTime(item.completed_at ?? item.started_at ?? item.queued_at)}
      </span>
    </li>
  );
}
