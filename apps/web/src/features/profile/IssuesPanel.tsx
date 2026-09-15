import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDatasetIssuesQuery } from "@/features/datasets/queries";
import { formatCount, formatPercent } from "@/lib/format";
import type { IssueSeverity } from "@/types/profile";

interface IssuesPanelProps {
  datasetId: string;
  enabled: boolean;
  versionId?: string;
  onPrepareFix?: (operation: string, parameters: Record<string, unknown>) => void;
  onIncludeInCleanup?: (recommendationFocus: string) => void;
}

const severityTone: Record<IssueSeverity, "danger" | "warning" | "info"> = {
  CRITICAL: "danger",
  WARNING: "warning",
  INFO: "info",
};

export function IssuesPanel({
  datasetId,
  enabled,
  versionId,
  onPrepareFix,
  onIncludeInCleanup,
}: IssuesPanelProps) {
  const [severity, setSeverity] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = useDatasetIssuesQuery(datasetId, enabled, {
    severity: severity || undefined,
    version: versionId,
  });

  if (query.isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading issues">
        <Skeleton className="h-40 w-full" />
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-ink-secondary">
          Severity
          <select
            className="ml-2 rounded-[var(--facilio-radius-sm)] border border-line bg-raised px-2 py-1 text-sm text-ink"
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value);
            }}
          >
            <option value="">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </label>
        <p className="text-xs text-ink-muted">{formatCount(data.total)} issues</p>
      </div>
      {data.items.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {severity
            ? "No problems match these filters."
            : "No problems match the current filters."}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--facilio-radius-md)] border border-line">
          {data.items.map((issue) => {
            const open = expanded === issue.id;
            return (
              <li key={issue.id}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-subtle"
                  aria-label={`Review ${issue.title}`}
                  aria-expanded={open}
                  onClick={() => {
                    setExpanded(open ? null : issue.id);
                  }}
                >
                  <span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={severityTone[issue.severity]}>{issue.severity}</Badge>
                      <span className="text-sm font-medium text-ink">{issue.title}</span>
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted">
                      {issue.column ?? "Dataset"} · {formatCount(issue.affected_count)}{" "}
                      affected · {formatPercent(issue.affected_percentage)}
                    </span>
                  </span>
                </button>
                {open ? (
                  <div className="space-y-2 px-4 pb-4 text-sm leading-6 text-ink-secondary">
                    <p>{issue.description}</p>
                    {issue.evidence.length > 0 ? (
                      <p className="font-mono text-xs text-ink">
                        Evidence:{" "}
                        {issue.evidence.map((item) => item || "(empty)").join(" · ")}
                      </p>
                    ) : null}
                    <p className="text-xs text-ink-muted">{issue.suggested_action}</p>
                    {onIncludeInCleanup && issue.suggested_operations?.length ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const code = issue.suggested_operations?.[0]?.code ?? "";
                          onIncludeInCleanup(`fix:${issue.id}:${code}`);
                        }}
                      >
                        Fix this
                      </Button>
                    ) : null}
                    {onPrepareFix && issue.suggested_operations?.length ? (
                      issue.suggested_operations.map((suggestion) => (
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
                    ) : onPrepareFix && !issue.suggested_operations?.length ? (
                      <p className="text-xs text-ink-muted">
                        FACILIO found this, but it doesn’t have a safe guided cleanup for
                        it. Review the data or open manual Clean.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
