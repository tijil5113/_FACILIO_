import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { UploadDialog } from "@/features/datasets/UploadDialog";
import {
  useDatasetsQuery,
  useImportCustomerSampleMutation,
  useUploadDatasetMutation,
} from "@/features/datasets/queries";
import { useJobsQuery } from "@/features/jobs/queries";
import { FirstUseCue } from "@/features/onboarding/FirstUseCue";
import { classifyHome, isSampleDataset } from "@/features/overview/home-state";
import { SystemHealthPanel } from "@/features/system-health/SystemHealthPanel";
import { useWorkflowsQuery } from "@/features/workflows/queries";
import { useHealthQuery } from "@/hooks/use-system-status";
import { APP_NAME } from "@/lib/config";
import { formatCount, formatRelativeTime } from "@/lib/format";
import { jobStatusLabel, profileStatusLabel } from "@/lib/status-labels";
import { versionHeadline } from "@/lib/version-labels";
import type { DatasetDetail, DatasetSummary } from "@/types/dataset";

export function OverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const tryStarted = useRef(false);
  const navigate = useNavigate();
  const datasetsQuery = useDatasetsQuery(1, 20);
  const health = useHealthQuery();
  const apiDown = health.isError;
  const homeKind = classifyHome({
    datasetsPending: datasetsQuery.isPending,
    datasetsFailed: datasetsQuery.isError,
    apiDown,
    items: datasetsQuery.data?.items,
  });
  const hasUserData = homeKind === "returning";
  const jobsQuery = useJobsQuery({ page: 1, page_size: 5 }, hasUserData);
  const workflowsQuery = useWorkflowsQuery(1, false, hasUserData);
  const uploadMutation = useUploadDatasetMutation();
  const sampleMutation = useImportCustomerSampleMutation();

  const items = datasetsQuery.data?.items ?? [];
  const sampleDataset = items.find(isSampleDataset);
  const userDatasets = items.filter((item) => !isSampleDataset(item));
  const recentDatasets = (hasUserData ? userDatasets : items).slice(0, 5);
  const needsAttention = userDatasets
    .filter((item) => (item.issue_count ?? 0) > 0)
    .slice(0, 4);

  useEffect(() => {
    if (searchParams.get("upload") === "1" && !apiDown) {
      setUploadOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("upload");
      setSearchParams(next, { replace: true });
    }
  }, [apiDown, searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get("try") !== "1") {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("try");
    setSearchParams(next, { replace: true });
    if (apiDown || sampleMutation.isPending || tryStarted.current) {
      return;
    }
    tryStarted.current = true;
    void runSampleImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume try=1 once
  }, [searchParams, apiDown, setSearchParams]);

  function sampleDestination(dataset: DatasetDetail): string {
    if (dataset.profile_status === "READY") {
      return `/datasets/${dataset.id}?tab=problems`;
    }
    return `/datasets/${dataset.id}?analyze=1`;
  }

  async function runSampleImport() {
    try {
      const dataset = await sampleMutation.mutateAsync();
      void navigate(sampleDestination(dataset));
    } catch {
      tryStarted.current = false;
    }
  }

  function onUploaded(dataset: DatasetDetail) {
    void navigate(`/datasets/${dataset.id}?analyze=1`);
  }

  const sampleBusy = sampleMutation.isPending;
  const sampleError =
    sampleMutation.isError && sampleMutation.error instanceof Error
      ? sampleMutation.error.message
      : sampleMutation.isError
        ? "The sample could not be added."
        : null;

  return (
    <div
      className="page-enter mx-auto max-w-5xl space-y-8"
      data-testid="home-kind"
      data-kind={homeKind}
    >
      {homeKind === "loading" ? <HomeLoadingState /> : null}

      {homeKind === "degraded" ? (
        <DegradedHome
          message={
            datasetsQuery.error instanceof Error
              ? datasetsQuery.error.message
              : apiDown
                ? "FACILIO cannot reach the data service right now."
                : "Datasets could not be loaded."
          }
          onRetry={() => {
            void health.refetch();
            void datasetsQuery.refetch();
          }}
        />
      ) : null}

      {homeKind === "empty" ? (
        <FirstRunHome
          onUpload={() => {
            setUploadOpen(true);
          }}
          onTryFacilio={() => {
            void runSampleImport();
          }}
          sampleBusy={sampleBusy}
          sampleError={sampleError}
        />
      ) : null}

      {homeKind === "sample-only" && sampleDataset ? (
        <SampleOnlyHome
          sample={sampleDataset}
          onUpload={() => {
            setUploadOpen(true);
          }}
          sampleBusy={sampleBusy}
          sampleError={sampleError}
        />
      ) : null}

      {homeKind === "returning" ? (
        <ReturningHome
          datasets={recentDatasets}
          needsAttention={needsAttention}
          jobs={jobsQuery}
          workflows={workflowsQuery}
          onUpload={() => {
            setUploadOpen(true);
          }}
        />
      ) : null}

      <UploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
        }}
        maxUploadSizeMb={datasetsQuery.data?.max_upload_size_mb ?? 16}
        onUploaded={onUploaded}
        upload={async (form) => uploadMutation.mutateAsync(form)}
      />
    </div>
  );
}

function HomeLoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading Home">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-16 w-full max-w-2xl" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function DegradedHome({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="max-w-3xl space-y-4">
      <p className="font-mono text-[11px] tracking-[0.18em] text-ink-muted uppercase">
        {APP_NAME}
      </p>
      <h1 className="text-[28px] font-semibold tracking-tight text-ink md:text-[32px]">
        FACILIO cannot reach the data service right now.
      </h1>
      <Callout
        tone="danger"
        title="Service unavailable"
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        <p>{message}</p>
        <p className="mt-1">
          Your interface is available, but datasets and analysis may not load.
        </p>
      </Callout>
      <TechnicalDetails>
        <SystemHealthPanel />
      </TechnicalDetails>
    </section>
  );
}

function FirstRunHome({
  onUpload,
  onTryFacilio,
  sampleBusy,
  sampleError,
}: {
  onUpload: () => void;
  onTryFacilio: () => void;
  sampleBusy: boolean;
  sampleError: string | null;
}) {
  return (
    <>
      <section className="max-w-3xl">
        <p className="font-mono text-[11px] tracking-[0.18em] text-ink-muted uppercase">
          {APP_NAME}
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink md:text-[32px]">
          Turn messy data into data you can understand and trust.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-secondary">
          Find measurable problems, preview safe fixes, and keep your original data
          intact.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button onClick={onUpload} disabled={sampleBusy}>
            Upload my data
          </Button>
          <Button variant="secondary" onClick={onTryFacilio} disabled={sampleBusy}>
            {sampleBusy ? "Adding dataset…" : "Try FACILIO"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-ink-muted" role="status" aria-live="polite">
          {sampleBusy
            ? "Adding the sample dataset through the real FACILIO engine."
            : "FACILIO stores your original file. Upload does not clean or rewrite values."}
        </p>
        <p className="mt-4">
          <Link
            to="/learn"
            className="text-sm text-ink-secondary underline decoration-line underline-offset-4 hover:text-ink"
          >
            New to FACILIO? Learn how it works
          </Link>
        </p>
        {sampleError ? (
          <div className="mt-4">
            <Callout
              tone="danger"
              title="Couldn’t start the sample"
              action={
                <Button variant="secondary" size="sm" onClick={onTryFacilio}>
                  Try again
                </Button>
              }
            >
              {sampleError} The sample wasn’t added.
            </Callout>
          </div>
        ) : null}
      </section>

      <FirstUseCue cue="home" title="Where to start">
        Start with your own file or try the sample.
      </FirstUseCue>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink">How FACILIO helps</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Understand your data",
              detail: "See its structure and measurable quality.",
            },
            {
              title: "Find problems",
              detail:
                "Review missing values, duplicates and inconsistencies FACILIO can actually detect.",
            },
            {
              title: "Clean safely",
              detail: "Preview changes before creating a cleaned version.",
            },
            {
              title: "Reuse your cleanup",
              detail: "Save useful cleanup steps and run them again.",
            },
          ].map((item) => (
            <li key={item.title}>
              <Card as="article" className="h-full">
                <h3 className="text-sm font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.detail}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <HowItWorks />
      <p className="max-w-2xl text-sm text-ink-muted">
        FACILIO keeps your original uploaded version unchanged when you create cleaned
        versions.
      </p>
    </>
  );
}

function SampleOnlyHome({
  sample,
  onUpload,
  sampleBusy,
  sampleError,
}: {
  sample: DatasetSummary;
  onUpload: () => void;
  sampleBusy: boolean;
  sampleError: string | null;
}) {
  const analyzed = sample.profile_status === "READY";
  const problems = sample.issue_count ?? 0;
  const href = analyzed
    ? `/datasets/${sample.id}?tab=problems`
    : `/datasets/${sample.id}?analyze=1`;
  return (
    <>
      <section className="max-w-3xl">
        <p className="font-mono text-[11px] tracking-[0.18em] text-ink-muted uppercase">
          {APP_NAME}
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink md:text-[32px]">
          Continue exploring the sample
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-secondary">
          You’re using a fictional customer dataset. Upload your own file whenever you’re
          ready — nothing from the sample is treated as your data.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            to={href}
            className="inline-flex h-9 items-center justify-center rounded-[var(--facilio-radius-md)] border border-ink bg-ink px-3 text-sm font-medium text-canvas hover:bg-ink/90 dark:text-[#121410]"
          >
            Continue with sample
          </Link>
          <Button variant="secondary" onClick={onUpload} disabled={sampleBusy}>
            Upload my data
          </Button>
        </div>
        {sampleError ? (
          <div className="mt-4">
            <Callout tone="danger" title="Couldn’t start the sample">
              {sampleError}
            </Callout>
          </div>
        ) : null}
      </section>
      <Card as="article">
        <p className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
          Sample
        </p>
        <h2 className="mt-1 text-base font-medium text-ink">{sample.name}</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          {analyzed
            ? problems > 0
              ? `${formatCount(problems)} problems detected`
              : "Analyzed — no detected problems"
            : profileStatusLabel(sample.profile_status)}
        </p>
      </Card>
    </>
  );
}

function ReturningHome({
  datasets,
  needsAttention,
  jobs,
  workflows,
  onUpload,
}: {
  datasets: DatasetSummary[];
  needsAttention: DatasetSummary[];
  jobs: ReturnType<typeof useJobsQuery>;
  workflows: ReturnType<typeof useWorkflowsQuery>;
  onUpload: () => void;
}) {
  return (
    <>
      <section className="max-w-3xl">
        <p className="font-mono text-[11px] tracking-[0.18em] text-ink-muted uppercase">
          {APP_NAME}
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink md:text-[32px]">
          Continue working
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-secondary">
          Pick up a dataset, review problems, or upload another file. Your originals stay
          unchanged.
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={onUpload}>
            Upload my data
          </Button>
        </div>
        <p className="mt-4">
          <Link
            to="/learn"
            className="text-sm text-ink-secondary underline decoration-line underline-offset-4 hover:text-ink"
          >
            New to FACILIO? Learn how it works
          </Link>
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink">Recent datasets</h2>
        <ul className="space-y-2">
          {datasets.map((dataset) => (
            <li key={dataset.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {dataset.name}
                    {dataset.is_sample ? (
                      <span className="ml-2 font-mono text-[11px] tracking-wide text-ink-muted">
                        Sample
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {dataset.current_version_number
                      ? versionHeadline({
                          version_number: dataset.current_version_number,
                          kind:
                            dataset.current_version_number === 1 ? "ORIGINAL" : "DERIVED",
                        })
                      : "Version unavailable"}
                    {" · "}
                    {dataset.profile_status === "READY" && (dataset.issue_count ?? 0) > 0
                      ? `${formatCount(dataset.issue_count ?? 0)} problems detected`
                      : profileStatusLabel(dataset.profile_status)}
                  </p>
                </div>
                <DatasetContinue dataset={dataset} />
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {needsAttention.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">Needs attention</h2>
          <ul className="space-y-2">
            {needsAttention.map((dataset) => (
              <li key={dataset.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{dataset.name}</p>
                    <p className="mt-1 text-sm text-ink-secondary">
                      {formatCount(dataset.issue_count ?? 0)} problems detected
                    </p>
                  </div>
                  <Link
                    to={`/datasets/${dataset.id}?tab=problems`}
                    className="inline-flex h-9 items-center justify-center rounded-[var(--facilio-radius-md)] border border-ink bg-ink px-3 text-sm font-medium text-canvas hover:bg-ink/90 dark:text-[#121410]"
                  >
                    Review problems
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink">Recent activity</h2>
        {jobs.isError ? (
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
        ) : jobs.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : jobs.data.items.length === 0 ? null : (
          <ul className="space-y-2">
            {jobs.data.items.slice(0, 4).map((job) => (
              <li key={job.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {job.workflow_name ?? "Cleanup"}
                    </p>
                    <p className="mt-1 text-sm text-ink-secondary">
                      {jobStatusLabel(job.status)} · {formatRelativeTime(job.created_at)}
                    </p>
                  </div>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="inline-flex h-9 items-center rounded-[var(--facilio-radius-md)] border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-subtle"
                  >
                    View activity
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {workflows.isError ? (
        <Callout
          tone="warning"
          title="Cleanups couldn’t load"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void workflows.refetch()}
            >
              Retry
            </Button>
          }
        >
          Datasets on Home are still available.
        </Callout>
      ) : null}
      {!workflows.isError && (workflows.data?.items.length ?? 0) > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">Saved cleanups</h2>
          <ul className="space-y-2">
            {workflows.data?.items.slice(0, 4).map((workflow) => (
              <li key={workflow.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{workflow.name}</p>
                    <p className="mt-1 text-sm text-ink-secondary">
                      {formatCount(workflow.enabled_step_count)} steps
                    </p>
                  </div>
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="inline-flex h-9 items-center rounded-[var(--facilio-radius-md)] border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-subtle"
                  >
                    Open cleanup
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function DatasetContinue({ dataset }: { dataset: DatasetSummary }) {
  const analyzed = dataset.profile_status === "READY";
  const notAnalyzed = dataset.profile_status === "NOT_PROFILED";
  const href = analyzed ? `/datasets/${dataset.id}` : `/datasets/${dataset.id}?analyze=1`;
  const label = notAnalyzed ? "Analyze" : "Continue";
  return (
    <Link
      to={href}
      className="inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--facilio-radius-md)] border border-ink bg-ink px-3 text-sm font-medium text-canvas hover:bg-ink/90 dark:text-[#121410]"
    >
      {label}
    </Link>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Bring data", n: "1" },
    { title: "Understand", n: "2" },
    { title: "Problems", n: "3" },
    { title: "Clean", n: "4" },
    { title: "Reuse", n: "5" },
  ];
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-ink">How it works</h2>
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {steps.map((step, index) => (
          <li
            key={step.n}
            className="journey-step flex items-center gap-2"
            style={{ animationDelay: `${String(index * 70)}ms` }}
          >
            <span className="inline-flex min-h-10 items-center rounded-[var(--facilio-radius-md)] border border-line bg-surface px-3 py-2 text-sm text-ink">
              <span className="mr-2 text-xs text-ink-muted">{step.n}</span>
              {step.title}
            </span>
            {index < steps.length - 1 ? (
              <span className="hidden text-ink-muted sm:inline" aria-hidden="true">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
