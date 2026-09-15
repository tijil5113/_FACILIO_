import { Link, useParams } from "react-router";

import { Callout } from "@/components/ui/Callout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { useWorkflowRunQuery } from "@/features/workflows/queries";
import { formatCount, formatDateTime, formatScore } from "@/lib/format";

export function RunDetailPage() {
  const { runId } = useParams();
  const query = useWorkflowRunQuery(runId);

  if (query.isLoading) {
    return (
      <div className="page-enter mx-auto max-w-4xl space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Callout tone="danger" title="Run unavailable">
        {query.error instanceof Error
          ? query.error.message
          : "The run could not be loaded."}
      </Callout>
    );
  }
  const run = query.data;
  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Run details"
        title={run.workflow_name}
        description={`Revision ${String(run.workflow_revision)} · domain execution record`}
      />
      <StatusIndicator
        label={run.status.replaceAll("_", " ")}
        tone={
          run.status === "SUCCEEDED"
            ? "success"
            : run.status === "FAILED"
              ? "danger"
              : "neutral"
        }
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        <Item
          label="Input"
          value={
            run.input_version_number == null
              ? "—"
              : `V${String(run.input_version_number)}`
          }
        />
        <Item
          label="Output"
          value={
            run.output_version_number == null
              ? "None"
              : `V${String(run.output_version_number)}`
          }
        />
        <Item label="Started" value={formatDateTime(run.started_at)} />
        <Item
          label="Completed"
          value={run.completed_at ? formatDateTime(run.completed_at) : "—"}
        />
        <Item label="Duration" value={`${formatCount(run.duration_ms)} ms`} />
        <Item
          label="Quality"
          value={`${formatScore(run.quality_before)} → ${formatScore(run.quality_after)}`}
        />
      </dl>
      {run.input_dataset_id ? (
        <Link className="text-sm text-accent" to={`/datasets/${run.input_dataset_id}`}>
          Open input dataset
        </Link>
      ) : null}
      {run.status === "FAILED" ? (
        <Callout tone="danger" title="No output version was created">
          {run.error_message_safe ?? "A step failed. The input version is unchanged."}
        </Callout>
      ) : null}
      <section>
        <h2 className="text-sm font-medium text-ink">Step execution timeline</h2>
        <ol className="mt-3 space-y-3">
          {run.step_runs.map((step) => (
            <li
              key={step.id}
              className="rounded-[var(--facilio-radius-md)] border border-line px-4 py-3"
            >
              <p className="font-mono text-[11px] text-ink-muted">
                {String(step.position + 1).padStart(2, "0")} {step.operation_code}
              </p>
              <StatusIndicator
                compact
                label={step.status}
                tone={
                  step.status === "SUCCEEDED"
                    ? "success"
                    : step.status === "FAILED"
                      ? "danger"
                      : "neutral"
                }
              />
              <p className="mt-1 text-sm text-ink-secondary">
                {step.rows_before != null
                  ? `${String(step.rows_before)} → ${String(step.rows_after)} rows`
                  : "Not executed"}
                {step.changed_cells != null
                  ? ` · ${formatCount(step.changed_cells)} values changed`
                  : ""}
                {step.duration_ms != null ? ` · ${formatCount(step.duration_ms)} ms` : ""}
              </p>
              {step.error_message_safe ? (
                <p className="mt-1 text-sm text-danger">{step.error_message_safe}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--facilio-radius-md)] border border-line px-4 py-3">
      <dt className="font-mono text-[10px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
