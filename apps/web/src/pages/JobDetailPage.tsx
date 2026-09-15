import { Link, useParams } from "react-router";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { ResourceNotFound } from "@/features/recovery/ResourceNotFound";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import {
  useCancelJobMutation,
  useJobQuery,
  useRetryJobMutation,
} from "@/features/jobs/queries";
import {
  activityAnalysisNeedsAttention,
  activityHasOutput,
} from "@/lib/activity-outcome";
import { formatDateTime, formatDuration, formatScore } from "@/lib/format";
import { jobStatusLabel } from "@/lib/status-labels";
import { operationDisplayName } from "@/lib/operation-labels";
import { useUiStore } from "@/stores/ui-store";
import { ApiClientError } from "@/types/api";
import type { JobStatus } from "@/types/jobs";

const tone: Record<JobStatus, "success" | "danger" | "warning" | "info" | "neutral"> = {
  QUEUED: "neutral",
  RUNNING: "info",
  SUCCEEDED: "success",
  FAILED: "danger",
  CANCEL_REQUESTED: "warning",
  CANCELLED: "warning",
};

export function JobDetailPage() {
  const { jobId } = useParams();
  const query = useJobQuery(jobId);
  const cancel = useCancelJobMutation(jobId ?? "");
  const retry = useRetryJobMutation(jobId ?? "");
  const showNotice = useUiStore((state) => state.showNotice);

  if (query.isLoading) {
    return (
      <div className="page-enter mx-auto max-w-4xl space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    const missing =
      query.error instanceof ApiClientError && query.error.code === "JOB_NOT_FOUND";
    if (
      missing ||
      (query.error instanceof ApiClientError && query.error.status === 404)
    ) {
      return <ResourceNotFound resource="activity" error={query.error} />;
    }
    return (
      <RecoveryMessage
        experience={mapRecoveryError(query.error, {
          operation: "load",
          action: "Load activity",
          resourceId: jobId,
        })}
      />
    );
  }
  const job = query.data;
  const canCancel = job.status === "QUEUED" || job.status === "RUNNING";
  const percent =
    job.progress.total > 0
      ? Math.round((job.progress.current / job.progress.total) * 100)
      : 0;

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Activity"
        title={job.workflow_name ?? "Cleanup"}
        description={`Cleanup on ${job.dataset_name ?? "a dataset"}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <StatusIndicator
          label={jobStatusLabel(job.status)}
          tone={tone[job.status]}
          pulse={job.status === "QUEUED" || job.status === "RUNNING"}
        />
        <span className="text-xs text-ink-muted">{job.progress.label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {activityHasOutput(job) && job.dataset_id ? (
          <Link
            className="inline-flex h-9 items-center rounded-[var(--facilio-radius-md)] border border-ink bg-ink px-3 text-sm font-medium text-canvas dark:text-[#121410]"
            to={`/datasets/${job.dataset_id}?version=${job.output_version_id ?? ""}`}
          >
            Open cleaned version
          </Link>
        ) : null}
        {activityAnalysisNeedsAttention(job) &&
        job.dataset_id &&
        job.output_version_id ? (
          <Link
            className="inline-flex h-9 items-center rounded-[var(--facilio-radius-md)] border border-line px-3 text-sm"
            to={`/datasets/${job.dataset_id}?version=${job.output_version_id}&analyze=1`}
          >
            Retry analysis
          </Link>
        ) : null}
        {canCancel ? (
          <Button
            variant="secondary"
            onClick={() => {
              cancel.mutate(undefined, {
                onSuccess: () => {
                  showNotice("Cancellation requested.");
                },
              });
            }}
            disabled={cancel.isPending}
            aria-label="Cancel cleanup"
          >
            Cancel
          </Button>
        ) : null}
        {job.status === "FAILED" && job.retryable && !job.output_version_id ? (
          <Button
            onClick={() => {
              retry.mutate();
            }}
            disabled={retry.isPending}
            aria-label="Retry cleanup"
          >
            Retry
          </Button>
        ) : null}
        {job.workflow_id ? (
          <Link
            className="inline-flex h-9 items-center rounded-[var(--facilio-radius-md)] border border-line px-3 text-sm"
            to={`/workflows/${job.workflow_id}`}
          >
            Open cleanup
          </Link>
        ) : null}
      </div>

      {job.status === "QUEUED" ? (
        <Callout tone="info" title="Waiting to start">
          Waiting for a worker. Your original data is unchanged.
        </Callout>
      ) : null}
      {job.status === "RUNNING" ? (
        <Callout tone="info" title={job.current_activity ?? "Running"}>
          {job.current_operation_code
            ? `Current step: ${operationDisplayName(job.current_operation_code)}.`
            : "This cleanup is in progress."}{" "}
          Your original stays unchanged until a new version is created.
        </Callout>
      ) : null}
      {job.status === "CANCEL_REQUESTED" ? (
        <Callout tone="warning" title="Stopping">
          The current step will finish before this cleanup stops. It is not cancelled yet.
          Original data is still intact.
        </Callout>
      ) : null}
      {job.status === "CANCELLED" ? (
        <Callout tone="info" title="Cleanup cancelled">
          No cleaned version was created. Your input version is unchanged.
        </Callout>
      ) : null}
      {job.status === "FAILED" && !job.output_version_id ? (
        <RecoveryMessage
          experience={{
            title: "Cleanup couldn't finish",
            explanation:
              job.error_message_safe ??
              "The cleanup failed before creating a new version.",
            consequence: "No cleaned output was confirmed. Your original is unchanged.",
            severity: "error",
            retrySafe: job.retryable,
            action: "Run cleanup",
            resourceId: job.id,
            dataSafety: "not-created",
            code: job.error_code ?? undefined,
          }}
          extraDetails={[
            { label: "Job ID", value: job.id },
            { label: "Run ID", value: job.workflow_run_id },
            {
              label: "Attempt",
              value: `${String(job.attempt_count)} of ${String(job.max_attempts)}`,
            },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              {job.retryable && !job.output_version_id ? (
                <Button
                  size="sm"
                  onClick={() => {
                    retry.mutate();
                  }}
                  disabled={retry.isPending}
                >
                  Retry
                </Button>
              ) : null}
              {job.workflow_id ? (
                <Link
                  className="inline-flex h-8 items-center rounded-[var(--facilio-radius-md)] border border-line px-3 text-xs"
                  to={`/workflows/${job.workflow_id}`}
                >
                  Open cleanup
                </Link>
              ) : null}
              {job.dataset_id ? (
                <Link
                  className="inline-flex h-8 items-center rounded-[var(--facilio-radius-md)] border border-line px-3 text-xs"
                  to={`/datasets/${job.dataset_id}`}
                >
                  Open dataset
                </Link>
              ) : null}
            </div>
          }
        />
      ) : null}
      {job.status === "SUCCEEDED" || job.output_version_id ? (
        <Callout
          tone={activityAnalysisNeedsAttention(job) ? "warning" : "success"}
          title={
            activityAnalysisNeedsAttention(job)
              ? "Cleanup finished · analysis needs attention"
              : "Cleanup finished"
          }
        >
          <p>
            Cleaned version V{job.output_version_number ?? "—"}
            {job.rows_before != null && job.rows_after != null
              ? ` · rows ${String(job.rows_before)} → ${String(job.rows_after)}`
              : ""}
            {job.quality_before != null || job.quality_after != null
              ? ` · quality ${formatScore(job.quality_before)} → ${formatScore(job.quality_after)}`
              : ""}
          </p>
          {activityAnalysisNeedsAttention(job) ? (
            <p className="mt-1">
              V{job.output_version_number ?? ""} was created successfully, but FACILIO
              could not analyze the cleaned version. The original version was not
              overwritten.
            </p>
          ) : (
            <p className="mt-1">The original version was not overwritten.</p>
          )}
        </Callout>
      ) : null}

      <section aria-labelledby="execution-progress">
        <h2 id="execution-progress" className="text-sm font-medium text-ink">
          Steps
        </h2>
        <p className="mt-1 text-sm text-ink-secondary" aria-live="polite">
          {job.progress.label}
          {job.progress.total > 0 ? ` · ${String(percent)}% steps complete` : ""}
        </p>
        <ol className="mt-4 space-y-3">
          {job.step_runs.map((step, index) => (
            <li key={step.id} className="border-t border-line pt-3">
              <p className="text-sm font-medium text-ink">
                {String(index + 1).padStart(2, "0")}{" "}
                {operationDisplayName(step.operation_code)}
              </p>
              <p className="text-sm text-ink-secondary">
                {jobStatusLabel(step.status)}
                {step.duration_ms != null ? ` · ${formatDuration(step.duration_ms)}` : ""}
                {step.error_message_safe ? ` · ${step.error_message_safe}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <dl className="grid gap-3 sm:grid-cols-2">
        <Item label="Dataset" value={job.dataset_name ?? "—"} />
        <Item
          label="Input version"
          value={
            job.input_version_number == null
              ? "—"
              : `V${String(job.input_version_number)}`
          }
        />
        <Item
          label="Cleaned version"
          value={
            job.output_version_number == null
              ? "None"
              : `V${String(job.output_version_number)}`
          }
        />
        <Item
          label="Started"
          value={job.started_at ? formatDateTime(job.started_at) : "—"}
        />
        <Item label="Queued" value={formatDateTime(job.queued_at)} />
        <Item label="Execution time" value={formatDuration(job.execution_ms)} />
      </dl>

      <TechnicalDetails>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Item label="Job ID" value={job.id} />
          <Item label="Run ID" value={job.workflow_run_id} />
          <Item
            label="Attempt"
            value={`${String(job.attempt_count)} of ${String(job.max_attempts)}`}
          />
          <Item
            label="Heartbeat"
            value={job.heartbeat_at ? formatDateTime(job.heartbeat_at) : "—"}
          />
          {job.error_code ? <Item label="Error code" value={job.error_code} /> : null}
        </dl>
        <section className="mt-4" aria-labelledby="attempt-history">
          <h3 id="attempt-history" className="text-sm font-medium text-ink">
            Attempts
          </h3>
          {job.attempts.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No worker has claimed this yet.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {[...job.attempts].reverse().map((attempt) => (
                <li
                  key={attempt.id}
                  className="rounded-[var(--facilio-radius-sm)] border border-line px-3 py-2 text-sm"
                >
                  <p className="font-medium text-ink">
                    Attempt {attempt.attempt_number} · {jobStatusLabel(attempt.status)}
                  </p>
                  <p className="text-ink-secondary">
                    {attempt.worker_id ? `Worker ${attempt.worker_id} · ` : ""}
                    {formatDuration(attempt.duration_ms)}
                    {attempt.error_code ? ` · ${attempt.error_code}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </TechnicalDetails>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
