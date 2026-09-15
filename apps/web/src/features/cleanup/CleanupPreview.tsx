import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { formatCount, formatScore } from "@/lib/format";
import { operationDisplayName } from "@/lib/operation-labels";
import { versionHeadline } from "@/lib/version-labels";
import type { CleanupPreview } from "@/types/cleanup";

import { displayCell } from "./error-copy";

interface CleanupPreviewViewProps {
  preview: CleanupPreview;
  versionNumber: number;
}

export function CleanupPreviewView({ preview, versionNumber }: CleanupPreviewViewProps) {
  return (
    <section className="space-y-5" aria-label="Preview">
      <p className="text-sm text-ink-secondary">
        FACILIO has not changed your data yet. This is the real effect of the selected
        steps, in order.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <PreviewStat
          label="Input"
          value={versionHeadline({ version_number: preview.input_version_number })}
        />
        <PreviewStat label="Selected fixes" value={formatCount(preview.steps.length)} />
        <PreviewStat
          label="Rows"
          value={`${formatCount(preview.rows_before)} → ${formatCount(preview.rows_after)}`}
        />
        <PreviewStat
          label="Columns"
          value={`${formatCount(preview.columns_before)} → ${formatCount(preview.columns_after)}`}
        />
        <PreviewStat
          label="Changed cells"
          value={formatCount(preview.changed_cell_count)}
        />
        <PreviewStat label="Expected output" value={preview.expected_output} />
      </dl>
      {preview.removed_row_count > 0 ? (
        <Callout tone="warning" title="Rows will be removed">
          {formatCount(preview.removed_row_count)}{" "}
          {preview.removed_row_count === 1 ? "row" : "rows"} will be removed. Your
          original remains unchanged.
        </Callout>
      ) : null}
      {preview.removed_column_count > 0 ? (
        <Callout tone="warning" title="Columns will be removed">
          {formatCount(preview.removed_column_count)}{" "}
          {preview.removed_column_count === 1 ? "column" : "columns"} will be dropped.
        </Callout>
      ) : null}
      {preview.high_impact ? (
        <Callout tone="warning" title="High impact">
          This cleanup removes a large share of rows. Confirm this on the next step. Your
          original remains unchanged.
        </Callout>
      ) : null}
      {preview.no_op ? (
        <Callout tone="info" title="These steps wouldn't change this version">
          The selected values already match the requested cleanup. FACILIO will not create
          a redundant version.
        </Callout>
      ) : null}
      {preview.projected_quality ? (
        <p className="text-sm text-ink-secondary">
          FACILIO’s measured quality would change from{" "}
          {formatScore(preview.projected_quality.before)} to{" "}
          {formatScore(preview.projected_quality.after)}. This is projected from the real
          profiler on an unsaved result.
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          Quality comparison will be shown after the cleaned version is created.
        </p>
      )}
      <ol className="space-y-2" aria-label="Cleanup order">
        {preview.steps.map((step, index) => (
          <li
            key={step.step_id}
            className="rounded-[var(--facilio-radius-md)] border border-line px-4 py-3 text-sm"
          >
            <span className="font-medium text-ink">
              {index + 1}. {operationDisplayName(step.operation_code)}
            </span>
            <span className="mt-1 block text-xs text-ink-muted">{step.summary}</span>
          </li>
        ))}
      </ol>
      <BeforeAfterComparison preview={preview} />
      <p className="text-xs text-ink-muted">
        Cleaning {versionHeadline({ version_number: versionNumber })}.
      </p>
    </section>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3">
      <dt className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export function BeforeAfterComparison({ preview }: { preview: CleanupPreview }) {
  const examples = preview.examples;
  if (examples.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No bounded examples were produced for this plan.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[var(--facilio-radius-md)] border border-line">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Before and after examples</caption>
        <thead className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">Column</th>
            <th className="px-3 py-2 font-medium">Before</th>
            <th className="px-3 py-2 font-medium">After</th>
            <th className="px-3 py-2 font-medium">Step</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((example, index) => {
            const changed =
              example.kind !== "row_removed" && example.before !== example.after;
            return (
              <tr
                key={`${String(example.step_position)}-${String(index)}`}
                className="border-t border-line"
              >
                <td className="px-3 py-2 text-ink">{example.column ?? "Row"}</td>
                <td className="px-3 py-2 font-mono text-xs text-ink-secondary">
                  {example.kind === "row_removed" ? (
                    <span className="line-through decoration-ink-muted">
                      duplicate row
                    </span>
                  ) : (
                    displayCell(example.before)
                  )}
                </td>
                <td
                  className={`px-3 py-2 font-mono text-xs ${
                    example.kind === "row_removed"
                      ? "text-ink-muted"
                      : changed
                        ? "bg-accent-soft font-medium text-ink"
                        : "text-ink-muted"
                  }`}
                >
                  {example.kind === "row_removed" ? (
                    <span className="inline-flex items-center gap-1">
                      <Badge tone="warning">removed</Badge>
                      <span className="sr-only">Row removed</span>
                    </span>
                  ) : (
                    <>
                      {displayCell(example.after)}
                      {changed ? <span className="sr-only"> (changed)</span> : null}
                    </>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-ink-muted">
                  {String(example.step_position + 1)}.{" "}
                  {operationDisplayName(example.operation_code)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
