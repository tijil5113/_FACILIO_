import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Callout } from "@/components/ui/Callout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { executionStory } from "@/features/jobs/execution-story";
import {
  useCancelJobMutation,
  useJobQuery,
  useOperationsHealthQuery,
  useRetryJobMutation,
} from "@/features/jobs/queries";
import { ResourceNotFound } from "@/features/recovery/ResourceNotFound";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { humanStepLabel } from "@/features/workflows/step-language";
import { activityOutcome } from "@/lib/activity-outcome";
import {
  formatDateTime,
  formatDuration,
  formatElapsedSince,
  formatScore,
} from "@/lib/format";
import { profileStatusLabel } from "@/lib/status-labels";
import { useContextTitle } from "@/hooks/use-context-title";
import { useUiStore } from "@/stores/ui-store";
import { ApiClientError } from "@/types/api";

export function JobDetailPage() {
  const { jobId } = useParams();
  const query = useJobQuery(jobId);
  const operations = useOperationsHealthQuery();
  const cancel = useCancelJobMutation(jobId ?? "");
  const retry = useRetryJobMutation(jobId ?? "");
  const showNotice = useUiStore((state) => state.showNotice);
  useContextTitle(query.data?.workflow_name ?? query.data?.dataset_name ?? null);
  const previousKind = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const job = query.data;
  const workerAvailable = operations.data
    ? operations.data.worker.status === "available"
    : true;
  const outcome = job ? activityOutcome(job, { workerAvailable }) : null;

  useEffect(() => {
    if (!outcome) {
      return;
    }
    if (previousKind.current && previousKind.current !== outcome.kind) {
      setAnnouncement(outcome.headline);
    }
    previousKind.current = outcome.kind;
  }, [outcome]);

  if (query.isLoading) {
    return (
      <div className="page-enter mx-auto max-w-4xl space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <TableSkeleton rows={6} />
      </div>
    );
  }
  if (query.isError || !job || !outcome) {
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

  const canCancel = job.status === "QUEUED" || job.status === "RUNNING";
  const canRetry = job.status === "FAILED" && job.retryable && !outcome.hasOutput;
  const stages = executionStory(job);

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Activity"
        title={outcome.headline}
        description={`${job.workflow_name ?? "Cleanup"} on ${job.dataset_name ?? "a dataset"}`}
        meta={
          <span>
            {formatRelativeOrAbsolute(
              job.completed_at ?? job.started_at ?? job.queued_at,
            )}
          </span>
        }
      />
      <StatusIndicator
        label={outcome.headline}
        tone={outcome.tone}
        pulse={outcome.kind === "running" || outcome.kind === "waiting"}
      />
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <div className="flex flex-wrap gap-2">
        {outcome.hasOutput && job.dataset_id && job.output_version_id ? (
          <ButtonLink to={`/datasets/${job.dataset_id}?version=${job.output_version_id}`}>
            Open cleaned version
          </ButtonLink>
        ) : null}
        {outcome.hasOutput &&
        job.dataset_id &&
        job.input_version_id &&
        job.output_version_id ? (
          <ButtonLink
            variant="secondary"
            to={`/datasets/${job.dataset_id}?version=${job.output_version_id}&tab=history`}
          >
            Compare versions
          </ButtonLink>
        ) : null}
        {outcome.analysisNeedsAttention && job.dataset_id && job.output_version_id ? (
          <ButtonLink
            variant="secondary"
            to={`/datasets/${job.dataset_id}?version=${job.output_version_id}&analyze=1`}
          >
            Retry analysis
          </ButtonLink>
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
        {canRetry ? (
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
          <ButtonLink variant="secondary" to={`/workflows/${job.workflow_id}`}>
            Open Cleanup
          </ButtonLink>
        ) : null}
      </div>

      {outcome.kind === "waiting" ? (
        <Callout tone="info" title="Waiting">
          FACILIO is waiting to start this Cleanup. Your original data is unchanged.
        </Callout>
      ) : null}
      {outcome.kind === "worker_unavailable" ? (
        <Callout tone="warning" title="Cleanup can't start right now">
          FACILIO's background processing service is unavailable. Your data has not been
          changed.
        </Callout>
      ) : null}
      {outcome.kind === "running" ? (
        <Callout tone="info" title="Running">
          {job.progress.total > 0 ? `${job.progress.label}. ` : ""}
          {job.started_at ? `Elapsed ${formatElapsedSince(job.started_at)}. ` : ""}
          Your original stays unchanged until a new version is created.
        </Callout>
      ) : null}
      {outcome.kind === "stopping" ? (
        <Callout tone="warning" title="Stopping">
          The current step will finish before this Cleanup stops. It is not cancelled yet.
          Original data is still intact.
        </Callout>
      ) : null}
      {outcome.kind === "cancelled" ? (
        <Callout tone="info" title="Cancelled">
          No cleaned version was created. Your input version is unchanged.
        </Callout>
      ) : null}
      {outcome.kind === "failed" || outcome.kind === "stale" ? (
        <RecoveryMessage
          experience={{
            title: outcome.headline,
            explanation:
              job.error_message_safe ??
              "The Cleanup failed before creating a new version.",
            consequence:
              "No cleaned version was created. Your source version remains available.",
            severity: "error",
            retrySafe: canRetry,
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
              {canRetry ? (
                <Button
                  size="sm"
                  onClick={() => {
                    retry.mutate();
                  }}
                  disabled={retry.isPending}
                >
                  Retry this Cleanup
                </Button>
              ) : job.workflow_id ? (
                <ButtonLink
                  size="sm"
                  variant="secondary"
                  to={`/workflows/${job.workflow_id}`}
                >
                  Open Cleanup
                </ButtonLink>
              ) : null}
            </div>
          }
        />
      ) : null}
      {outcome.hasOutput ? (
        <Callout
          tone={outcome.analysisNeedsAttention ? "warning" : "success"}
          title="Cleaned version created"
        >
          <p>
            Output{" "}
            {job.output_version_number != null
              ? `V${String(job.output_version_number)}`
              : "version"}{" "}
            on {job.dataset_name ?? "the dataset"}
            {job.input_version_number != null
              ? ` from V${String(job.input_version_number)}`
              : ""}
            {job.completed_at ? ` · ${formatDateTime(job.completed_at)}` : ""}
            {job.rows_before != null && job.rows_after != null
              ? ` · rows ${String(job.rows_before)} → ${String(job.rows_after)}`
              : ""}
          </p>
          {outcome.analysisNeedsAttention ? (
            <p className="mt-1">
              Analysis needs attention. The cleaned version is still available. The
              original was not overwritten.
            </p>
          ) : (
            <p className="mt-1">The original version was not overwritten.</p>
          )}
        </Callout>
      ) : null}

      <section aria-labelledby="execution-story">
        <h2 id="execution-story" className="type-section text-ink">
          Execution
        </h2>
        <ol className="mt-3 space-y-2">
          {stages.map((stage) => (
            <li key={stage.id} className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-ink">{stage.label}</span>
              <span className="type-caption text-ink-muted">
                {formatDateTime(stage.at)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="activity-input">
        <h2 id="activity-input" className="type-section text-ink">
          Input
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <Item label="Dataset" value={job.dataset_name ?? "—"} />
          <Item
            label="Source version"
            value={
              job.input_version_number == null
                ? "—"
                : `V${String(job.input_version_number)}`
            }
          />
          <Item label="Cleanup" value={job.workflow_name ?? "—"} />
          <Item
            label="Steps in this run"
            value={
              job.progress.total > 0
                ? String(job.progress.total)
                : String(job.step_runs.length || "—")
            }
          />
        </dl>
      </section>

      <section aria-labelledby="activity-output">
        <h2 id="activity-output" className="type-section text-ink">
          Output
        </h2>
        {outcome.hasOutput ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Item
              label="Cleaned version"
              value={
                job.output_version_number == null
                  ? "Created"
                  : `V${String(job.output_version_number)}`
              }
            />
            <Item
              label="Analysis"
              value={
                job.output_profile_status
                  ? profileStatusLabel(job.output_profile_status)
                  : "—"
              }
            />
            <Item
              label="Quality"
              value={`${formatScore(job.quality_before)} → ${formatScore(job.quality_after)}`}
            />
            <Item label="Duration" value={formatDuration(job.execution_ms)} />
          </dl>
        ) : (
          <p className="type-body mt-2 text-ink-secondary">
            No cleaned version was created.
          </p>
        )}
      </section>

      {job.step_runs.length > 0 ? (
        <section aria-labelledby="steps-that-ran">
          <h2 id="steps-that-ran" className="type-section text-ink">
            Steps that ran
          </h2>
          <p className="type-caption mt-1 text-ink-muted">
            This is the Cleanup definition at execution time.
            {job.progress.total > 0 ? ` ${job.progress.label}.` : ""}
          </p>
          <ol className="mt-3 space-y-3">
            {job.step_runs.map((step, index) => {
              const snapshot = step.step_snapshot as {
                operation_code?: string;
                parameters?: Record<string, unknown>;
              };
              const code = snapshot.operation_code ?? step.operation_code;
              const parameters = snapshot.parameters ?? {};
              return (
                <li key={step.id} className="border-t border-line pt-3">
                  <p className="text-sm font-medium text-ink">
                    {String(index + 1)}. {humanStepLabel(code, parameters)}
                  </p>
                  <p className="type-caption mt-1 text-ink-muted">
                    {step.status === "SUCCEEDED"
                      ? "Completed"
                      : step.status === "FAILED"
                        ? (step.error_message_safe ?? "Couldn't finish")
                        : step.status === "SKIPPED"
                          ? "Skipped"
                          : step.status === "RUNNING"
                            ? "Running"
                            : job.status === "QUEUED" || job.status === "RUNNING"
                              ? "Waiting"
                              : "Did not run"}
                    {step.duration_ms != null
                      ? ` · ${formatDuration(step.duration_ms)}`
                      : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <TechnicalDetails>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Item label="Job ID" value={job.id} />
          <Item label="Run ID" value={job.workflow_run_id} />
          <Item
            label="Revision"
            value={job.workflow_revision != null ? String(job.workflow_revision) : "—"}
          />
          <Item
            label="Attempt"
            value={`${String(job.attempt_count)} of ${String(job.max_attempts)}`}
          />
          <Item label="Queued" value={formatDateTime(job.queued_at)} />
          <Item
            label="Heartbeat"
            value={job.heartbeat_at ? formatDateTime(job.heartbeat_at) : "—"}
          />
          {job.request_id ? <Item label="Request ID" value={job.request_id} /> : null}
          {job.error_code ? <Item label="Error code" value={job.error_code} /> : null}
          {job.input_version_id ? (
            <Item label="Source version ID" value={job.input_version_id} />
          ) : null}
          {job.output_version_id ? (
            <Item label="Output version ID" value={job.output_version_id} />
          ) : null}
        </dl>
        <section className="mt-4" aria-labelledby="attempt-history">
          <h3 id="attempt-history" className="type-section text-ink">
            Attempts
          </h3>
          {job.attempts.length === 0 ? (
            <p className="mt-2 type-body-sm text-ink-muted">
              No worker has claimed this yet.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {[...job.attempts].reverse().map((attempt) => (
                <li
                  key={attempt.id}
                  className="rounded-[var(--facilio-radius-sm)] border border-line px-3 py-2 text-sm"
                >
                  <p className="font-medium text-ink">
                    Attempt {attempt.attempt_number} · {attempt.status}
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
      <dt className="type-meta text-ink-muted">{label}</dt>
      <dd className="mt-1 break-all text-sm text-ink">{value}</dd>
    </div>
  );
}

function formatRelativeOrAbsolute(value: string): string {
  return formatDateTime(value);
}
