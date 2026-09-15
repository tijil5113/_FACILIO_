import { Link } from "react-router";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useLineageQuery,
  useSetCurrentVersionMutation,
  useVersionComparisonQuery,
} from "@/features/datasets/queries";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { useUiStore } from "@/stores/ui-store";
import { formatCount, formatDateTime, formatScore } from "@/lib/format";
import { versionHeadline, versionTrustLabel } from "@/lib/version-labels";

interface HistoryPanelProps {
  datasetId: string;
  versionId: string;
  onSelectVersion: (versionId: string) => void;
}

export function HistoryPanel({
  datasetId,
  versionId,
  onSelectVersion,
}: HistoryPanelProps) {
  const lineageQuery = useLineageQuery(datasetId, versionId);
  const selectedKind = lineageQuery.data?.items.find(
    (node) => node.version.id === versionId,
  )?.version.kind;
  const comparisonQuery = useVersionComparisonQuery(
    datasetId,
    versionId,
    selectedKind === "DERIVED",
  );
  const restore = useSetCurrentVersionMutation(datasetId);

  if (lineageQuery.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (lineageQuery.isError) {
    return (
      <Callout tone="danger" title="History unavailable">
        History could not be loaded. Your versions were not changed.
      </Callout>
    );
  }
  const items = lineageQuery.data?.items ?? [];
  if (items.length === 0) {
    return <p className="text-sm text-ink-muted">No versions recorded yet.</p>;
  }

  return (
    <div className="space-y-5">
      <p>
        <LearnMoreLink to="/learn#versions">
          How versions protect your original
        </LearnMoreLink>
      </p>
      <ol className="space-y-3" aria-label="Version lineage">
        {[...items].reverse().map((node) => {
          const version = node.version;
          const selected = version.id === versionId;
          const depth = lineageDepth(items, version.id);
          return (
            <li key={version.id} style={{ marginLeft: `${String(depth * 12)}px` }}>
              <div
                className={`w-full rounded-[var(--facilio-radius-md)] border px-4 py-3 ${
                  selected
                    ? "border-ink bg-subtle"
                    : "border-line bg-surface hover:bg-subtle"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    onSelectVersion(version.id);
                  }}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">
                      {versionHeadline(version)}
                    </span>
                    <Badge>{versionTrustLabel(version)}</Badge>
                    {selected ? <Badge tone="neutral">Viewing</Badge> : null}
                    {version.is_current ? <Badge tone="accent">Using</Badge> : null}
                  </span>
                  <span className="mt-1 block text-sm text-ink-secondary">
                    {version.created_by_workflow_run_id && version.workflow_name
                      ? `Created by workflow ${version.workflow_name}${
                          version.workflow_revision != null
                            ? ` · Revision ${String(version.workflow_revision)}`
                            : ""
                        }`
                      : (node.transformation?.summary ?? version.label)}
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {formatCount(version.row_count)} rows ·{" "}
                    {formatDateTime(version.created_at)}
                  </span>
                </button>
                {version.created_by_workflow_run_id ? (
                  <TechnicalDetails>
                    <p>
                      Created by cleanup {version.workflow_name ?? "saved cleanup"}
                      {version.workflow_revision != null
                        ? ` · revision ${String(version.workflow_revision)}`
                        : ""}
                    </p>
                    <Link
                      to={`/runs/${version.created_by_workflow_run_id}`}
                      className="mt-2 inline-block text-xs text-accent hover:underline"
                    >
                      View originating run record
                    </Link>
                  </TechnicalDetails>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {comparisonQuery.data && !comparisonQuery.isError ? (
        <Card as="section" aria-label="Compare with parent">
          <h2 className="text-sm font-medium text-ink">Compare with parent</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            V{comparisonQuery.data.parent.version_number} → V
            {comparisonQuery.data.child.version_number}
            {comparisonQuery.data.impact
              ? ` · ${String(comparisonQuery.data.impact.rows_before)} → ${String(comparisonQuery.data.impact.rows_after)} rows`
              : ""}
          </p>
          <QualityDeltaBlock delta={comparisonQuery.data.quality_delta} />
        </Card>
      ) : null}
      <Button
        variant="secondary"
        onClick={() => {
          restore.mutate(versionId, {
            onSuccess: () => {
              useUiStore
                .getState()
                .showNotice("Using this version. Later versions are kept.");
            },
          });
        }}
        disabled={restore.isPending}
      >
        Use this version
      </Button>
      <p className="text-xs text-ink-muted">
        FACILIO will use this version going forward. Your original is preserved. Later
        versions are kept.
      </p>
    </div>
  );
}

export function QualityDeltaBlock({
  delta,
}: {
  delta: {
    before: number | null;
    after: number | null;
    delta: number | null;
  } | null;
}) {
  if (!delta || (delta.before == null && delta.after == null)) {
    return (
      <p className="mt-2 text-xs text-ink-muted">
        Quality comparison is available after both versions are analyzed.
      </p>
    );
  }
  const sign = delta.delta == null ? "" : delta.delta > 0 ? "+" : "";
  const assessed = delta.before != null && delta.after != null && delta.delta != null;
  return (
    <div className="mt-3">
      <p className="text-xs text-ink-muted">Data quality</p>
      <div className="mt-2 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-ink-muted">Before</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {formatScore(delta.before)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">After</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {formatScore(delta.after)}
          </p>
        </div>
        {assessed ? (
          <div>
            <p className="text-xs text-ink-muted">Change</p>
            <p className="text-lg font-medium tabular-nums text-ink">
              {sign}
              {delta.delta?.toFixed(1)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Change is not calculated because a score was not assessed.
          </p>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Quality is evidence-based, not a guarantee of business correctness. A cleanup may
        raise, lower, or leave the score unchanged.
      </p>
    </div>
  );
}

function lineageDepth(
  items: Array<{ version: { id: string; parent_version_id: string | null } }>,
  id: string,
  seen: Set<string> = new Set(),
): number {
  const node = items.find((item) => item.version.id === id);
  if (!node?.version.parent_version_id || seen.has(id)) {
    return 0;
  }
  seen.add(id);
  return 1 + lineageDepth(items, node.version.parent_version_id, seen);
}
