import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { useJobsQuery } from "@/features/jobs/queries";
import { RETURNING_UPLOAD_LABEL } from "@/features/overview/home-content";
import {
  boundedRecentDatasets,
  continueWorkingSummary,
  featuredUserDataset,
  isSampleDataset,
  nextDatasetAction,
} from "@/features/overview/home-state";
import { activityResultLabel } from "@/lib/activity-outcome";
import { formatRelativeTime } from "@/lib/format";
import { jobStatusLabel } from "@/lib/status-labels";
import { versionHeadline } from "@/lib/version-labels";
import type { DatasetSummary } from "@/types/dataset";
import type { JobStatus } from "@/types/jobs";

export function ReturningHome({
  datasets,
  jobs,
  onUpload,
}: {
  datasets: DatasetSummary[];
  jobs: ReturnType<typeof useJobsQuery>;
  onUpload: () => void;
}) {
  const featured = featuredUserDataset(datasets);
  const recent = boundedRecentDatasets(datasets, featured?.id);

  return (
    <div className="space-y-8">
      <section className="max-w-2xl">
        <h1 className="type-page-title text-ink">Welcome back</h1>
        <p className="type-body mt-2 text-ink-secondary">Continue where you left off.</p>
      </section>

      {featured ? <ContinueWorking dataset={featured} /> : null}

      {recent.length > 0 ? <RecentDatasets datasets={recent} /> : null}

      <RecentActivity jobs={jobs} />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onUpload}>
          {RETURNING_UPLOAD_LABEL}
        </Button>
        <ButtonLink to="/datasets" variant="ghost">
          All datasets
        </ButtonLink>
        <ButtonLink to="/workflows" variant="ghost">
          Cleanups
        </ButtonLink>
      </div>
    </div>
  );
}

function activityLine(job: {
  status: JobStatus;
  created_at: string;
  output_version_id?: string | null;
  output_version_number?: number | null;
  output_profile_status?: string | null;
  progress?: { label: string };
  current_activity?: string | null;
}): string {
  const status = jobStatusLabel(job.status);
  const result = activityResultLabel(job);
  const parts = result === status ? [status] : [status, result];
  parts.push(formatRelativeTime(job.created_at));
  return parts.join(" · ");
}

function ContinueWorking({ dataset }: { dataset: DatasetSummary }) {
  const action = nextDatasetAction(dataset);
  return (
    <section
      aria-labelledby="continue-working-heading"
      className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-5 py-5"
    >
      <p className="type-meta text-ink-muted uppercase">Continue working</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2
            id="continue-working-heading"
            className="type-section min-w-0 truncate text-ink"
            title={dataset.name}
          >
            {dataset.name}
          </h2>
          <p className="type-body-sm mt-2 text-ink-secondary">
            {dataset.current_version_number
              ? versionHeadline({
                  version_number: dataset.current_version_number,
                  kind: dataset.current_version_number === 1 ? "ORIGINAL" : "DERIVED",
                })
              : "Version unavailable"}
            {" · "}
            {continueWorkingSummary(dataset)}
            {" · "}
            {formatRelativeTime(dataset.updated_at)}
          </p>
        </div>
        <ButtonLink to={action.to} className="shrink-0">
          {action.label}
        </ButtonLink>
      </div>
    </section>
  );
}

function RecentDatasets({ datasets }: { datasets: DatasetSummary[] }) {
  return (
    <section aria-labelledby="recent-datasets-heading">
      <h2 id="recent-datasets-heading" className="type-section text-ink">
        Recent datasets
      </h2>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {datasets.map((dataset) => {
          const action = nextDatasetAction(dataset);
          return (
            <li
              key={dataset.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p
                  className="type-body min-w-0 truncate font-medium text-ink"
                  title={dataset.name}
                >
                  {dataset.name}
                  {isSampleDataset(dataset) ? (
                    <span className="ml-2 type-caption">Sample</span>
                  ) : null}
                </p>
                <p className="type-body-sm mt-1 text-ink-secondary">
                  {continueWorkingSummary(dataset)}
                </p>
              </div>
              <ButtonLink to={action.to} variant="secondary" className="shrink-0">
                {action.label}
              </ButtonLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecentActivity({ jobs }: { jobs: ReturnType<typeof useJobsQuery> }) {
  if (jobs.isError) {
    return (
      <Callout
        tone="warning"
        title="Activity couldn’t load"
        action={
          <Button variant="secondary" size="sm" onClick={() => void jobs.refetch()}>
            Retry
          </Button>
        }
      >
        Home still works. Open Activity when you’re ready to try again.
      </Callout>
    );
  }
  if (jobs.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading activity">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  const items = jobs.data.items.slice(0, 3);
  if (items.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="recent-activity-heading">
      <h2 id="recent-activity-heading" className="type-section text-ink">
        Recent activity
      </h2>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {items.map((job) => (
          <li
            key={job.id}
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="type-body truncate font-medium text-ink">
                {job.workflow_name ?? "Cleanup"}
              </p>
              <p className="type-body-sm mt-1 text-ink-secondary">{activityLine(job)}</p>
            </div>
            <ButtonLink to={`/jobs/${job.id}`} variant="secondary" className="shrink-0">
              View activity
            </ButtonLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
