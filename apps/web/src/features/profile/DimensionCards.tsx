import { formatScore } from "@/lib/format";
import type { QualityDimension } from "@/types/profile";

interface DimensionCardsProps {
  dimensions: QualityDimension[];
}

export function DimensionCards({ dimensions }: DimensionCardsProps) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {dimensions.map((dimension) => {
        const assessed = dimension.status === "ASSESSED" && dimension.score !== null;
        const width = assessed ? Math.max(0, Math.min(100, dimension.score ?? 0)) : 0;
        return (
          <li
            key={dimension.key}
            className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium text-ink">{dimension.label}</h3>
              <p className="font-mono text-sm tabular-nums text-ink">
                {assessed ? formatScore(dimension.score) : "Not assessed"}
              </p>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle"
              aria-hidden="true"
            >
              {assessed ? (
                <div className="h-full bg-ink" style={{ width: `${String(width)}%` }} />
              ) : (
                <div className="h-full w-full border border-dashed border-line-strong" />
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-secondary">
              {dimension.explanation}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{dimension.evidence_summary}</p>
          </li>
        );
      })}
    </ul>
  );
}
