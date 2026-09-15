import { Link } from "react-router";

import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQualityOverviewQuery } from "@/features/datasets/queries";
import { formatDateTime, formatScore } from "@/lib/format";

export function QualityPage() {
  const query = useQualityOverviewQuery();

  if (query.isLoading) {
    return (
      <div className="page-enter mx-auto max-w-5xl space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="page-enter mx-auto max-w-5xl">
        <Callout tone="danger" title="Quality overview unavailable">
          FACILIO can't reach the data service right now. Quality scores were not changed.
        </Callout>
      </div>
    );
  }

  const data = query.data;
  if (!data || data.datasets_profiled === 0) {
    return (
      <EmptyState
        upcoming={false}
        title="Quality overview"
        summary="Scores are calculated only after a dataset is analyzed."
        detail="Open a dataset and choose Analyze data. Unanalyzed sources are not treated as 0 or 100."
        visual={
          <ul className="grid gap-4 sm:grid-cols-2">
            {["Completeness", "Uniqueness", "Validity", "Consistency", "Integrity"].map(
              (dimension) => (
                <li key={dimension} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink">{dimension}</p>
                    <p className="font-mono text-[11px] text-ink-muted">Not assessed</p>
                  </div>
                  <div
                    className="h-1.5 rounded-full border border-dashed border-line-strong bg-subtle"
                    aria-hidden="true"
                  />
                </li>
              ),
            )}
          </ul>
        }
      />
    );
  }

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Quality overview"
        description="Scores use each dataset’s current version only. Historical versions are not averaged into these totals."
      />
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Datasets analyzed" value={String(data.datasets_profiled)} />
        <SummaryStat
          label="Average assessed quality"
          value={
            data.average_quality === null
              ? "Not assessed"
              : formatScore(data.average_quality)
          }
        />
        <SummaryStat
          label="Needs attention"
          value={String(data.datasets_needing_attention)}
        />
        <SummaryStat label="Not analyzed" value={String(data.datasets_not_profiled)} />
      </dl>
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink">Recently analyzed</h2>
        <ul className="space-y-2">
          {data.recently_profiled.map((item) => (
            <li key={item.id}>
              <Link
                to={`/datasets/${item.id}`}
                className="flex items-center justify-between rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3 hover:bg-subtle"
              >
                <span>
                  <span className="block text-sm font-medium text-ink">{item.name}</span>
                  <span className="text-xs text-ink-muted">
                    {item.profiled_at ? formatDateTime(item.profiled_at) : "—"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge>{item.grade ?? "Not assessed"}</Badge>
                  <span className="font-mono text-sm tabular-nums">
                    {item.overall_score === null ? "—" : formatScore(item.overall_score)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <dt className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-xl font-medium tabular-nums text-ink">{value}</dd>
    </Card>
  );
}
