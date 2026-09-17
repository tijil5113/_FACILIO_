import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { useDatasetIssuesQuery } from "@/features/datasets/queries";
import {
  affectedCountLabel,
  groupIssues,
  humanIssueTitle,
  isActionableIssue,
  issueKindLabel,
} from "@/features/datasets/issue-language";
import { formatCount } from "@/lib/format";
import type { QualityIssue } from "@/types/profile";

interface IssuesPanelProps {
  datasetId: string;
  enabled: boolean;
  versionId?: string;
  rowCount?: number | null;
  onPrepareFix?: (operation: string, parameters: Record<string, unknown>) => void;
  onIncludeInCleanup?: (recommendationFocus: string) => void;
}

export function IssuesPanel({
  datasetId,
  enabled,
  versionId,
  rowCount,
  onPrepareFix,
  onIncludeInCleanup,
}: IssuesPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = useDatasetIssuesQuery(datasetId, enabled, {
    version: versionId,
  });

  if (query.isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading problems">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-px h-10 w-full" />
        <Skeleton className="mt-px h-10 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Callout tone="danger" title="Problems unavailable">
        Problems could not be loaded. Your data was not changed.
      </Callout>
    );
  }
  const data = query.data;
  if (!data) {
    return null;
  }
  if (data.items.length === 0) {
    return (
      <p className="type-body text-ink-secondary">No problems match the current view.</p>
    );
  }

  const groups = groupIssues(data.items);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`issue-group-${group.key}`}>
          <h3 id={`issue-group-${group.key}`} className="type-section text-ink">
            {group.label}{" "}
            <span className="type-caption font-normal">
              {formatCount(group.items.length)}
            </span>
          </h3>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {group.items.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                open={expanded === issue.id}
                rowCount={rowCount}
                onToggle={() => {
                  setExpanded(expanded === issue.id ? null : issue.id);
                }}
                onPrepareFix={onPrepareFix}
                onIncludeInCleanup={onIncludeInCleanup}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function IssueRow({
  issue,
  open,
  rowCount,
  onToggle,
  onPrepareFix,
  onIncludeInCleanup,
}: {
  issue: QualityIssue;
  open: boolean;
  rowCount?: number | null;
  onToggle: () => void;
  onPrepareFix?: (operation: string, parameters: Record<string, unknown>) => void;
  onIncludeInCleanup?: (recommendationFocus: string) => void;
}) {
  const title = humanIssueTitle(issue);
  const actionable = isActionableIssue(issue);
  const detailsId = `issue-${issue.id}`;

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 py-3 text-left hover:bg-subtle"
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={`Review ${title}`}
        onClick={onToggle}
      >
        <span className="min-w-0">
          <span className="type-body block font-medium text-ink">{title}</span>
          <span className="type-caption mt-1 block text-ink-muted">
            {issue.column ? <span className="type-data">{issue.column}</span> : "Dataset"}
            {" · "}
            {affectedCountLabel(issue.affected_count, rowCount)}
            {" · "}
            {issueKindLabel(issue)}
          </span>
        </span>
      </button>
      {open ? (
        <div
          id={detailsId}
          className="space-y-3 pb-4 text-sm leading-6 text-ink-secondary"
        >
          <p>{issue.description}</p>
          {issue.evidence.length > 0 ? (
            <details className="rounded-[var(--facilio-radius-md)] border border-line bg-subtle px-3 py-2">
              <summary className="cursor-pointer type-card-title text-ink">
                Evidence
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-xs text-ink">
                {issue.evidence.map((item, index) => (
                  <li key={`${issue.id}-ev-${String(index)}`}>
                    {item === "" ? "Blank" : item}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {actionable && onIncludeInCleanup && issue.suggested_operations?.length ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const code = issue.suggested_operations?.[0]?.code ?? "";
                onIncludeInCleanup(`fix:${issue.id}:${code}`);
              }}
            >
              Clean these problems
            </Button>
          ) : null}
          {actionable && onPrepareFix && issue.suggested_operations?.length
            ? issue.suggested_operations.map((suggestion) => (
                <Button
                  key={suggestion.code}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onPrepareFix(suggestion.code, suggestion.parameters);
                  }}
                >
                  Open in manual Clean: {suggestion.display_name}
                </Button>
              ))
            : null}
          {!actionable ? (
            <p className="type-caption text-ink-muted">
              {issue.code === "HIGH_CARDINALITY"
                ? "This is informational. A high number of distinct values is not dataset corruption."
                : "FACILIO found this, but it doesn’t have a safe guided cleanup for it."}
            </p>
          ) : null}
          <TechnicalDetails>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="type-meta text-ink-muted">Issue code</dt>
                <dd className="type-mono mt-1 text-ink">{issue.code}</dd>
              </div>
              <div>
                <dt className="type-meta text-ink-muted">Category</dt>
                <dd className="type-mono mt-1 text-ink">{issue.category}</dd>
              </div>
              <div>
                <dt className="type-meta text-ink-muted">Engine severity</dt>
                <dd className="type-mono mt-1 text-ink">{issue.severity}</dd>
              </div>
              <div>
                <dt className="type-meta text-ink-muted">Affected</dt>
                <dd className="type-data mt-1 text-ink">
                  {formatCount(issue.affected_count)}
                </dd>
              </div>
            </dl>
            <p className="mt-2">{issue.suggested_action}</p>
          </TechnicalDetails>
        </div>
      ) : null}
    </li>
  );
}
