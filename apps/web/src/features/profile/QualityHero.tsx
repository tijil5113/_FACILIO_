import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { formatScore } from "@/lib/format";
import type { QualityDimension, QualitySummary } from "@/types/profile";

interface QualityPanelProps {
  quality: QualitySummary;
}

const QUALITY_EXPLANATION =
  "FACILIO's quality score summarizes measurable checks. It does not verify whether the data is correct for its real-world purpose.";

export function QualityHero({ quality }: QualityPanelProps) {
  return <QualityPanel quality={quality} />;
}

export function QualityPanel({ quality }: QualityPanelProps) {
  const assessed = quality.overall_status === "ASSESSED";
  const score = quality.overall_score;

  return (
    <section aria-label="Data quality" className="space-y-4">
      <div>
        <h2 className="type-section text-ink">Quality</h2>
        <p className="type-body-sm mt-1 text-ink-secondary">
          {assessed ? (
            <>
              <span className="type-data text-ink">{formatScore(score)}</span>
              {quality.grade ? (
                <span className="text-ink-muted">{` · ${quality.grade}`}</span>
              ) : null}
              . This is a summary of measured checks, not a percentage of correctness.
            </>
          ) : (
            "Overall quality is not assessed for this version."
          )}
        </p>
        <p className="type-caption mt-2 max-w-2xl text-ink-muted">
          {QUALITY_EXPLANATION}
        </p>
        <p className="type-caption mt-1 text-ink-muted">
          {quality.assessed_count === 1
            ? "1 dimension assessed"
            : `${String(quality.assessed_count)} dimensions assessed`}
          {quality.not_assessed_count
            ? ` · ${String(quality.not_assessed_count)} not assessed`
            : ""}
          . Assessed dimensions are weighted equally.
        </p>
        <p className="mt-2">
          <LearnMoreLink to="/learn#quality">What does this score mean?</LearnMoreLink>
        </p>
      </div>
      {quality.dimensions.length > 0 ? (
        <DimensionList dimensions={quality.dimensions} />
      ) : null}
    </section>
  );
}

export function DimensionCards({ dimensions }: { dimensions: QualityDimension[] }) {
  return <DimensionList dimensions={dimensions} />;
}

function DimensionList({ dimensions }: { dimensions: QualityDimension[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {dimensions.map((dimension) => {
        const assessed = dimension.status === "ASSESSED" && dimension.score !== null;
        const width = assessed ? Math.max(0, Math.min(100, dimension.score ?? 0)) : 0;
        const valueLabel = assessed ? formatScore(dimension.score) : "Not assessed";
        return (
          <li key={dimension.key} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="type-body font-medium text-ink">{dimension.label}</h3>
              <p className="type-data text-ink-secondary">{valueLabel}</p>
            </div>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-subtle"
              aria-hidden="true"
            >
              {assessed ? (
                <div className="h-full bg-ink" style={{ width: `${String(width)}%` }} />
              ) : (
                <div className="h-full w-full border border-dashed border-line-strong" />
              )}
            </div>
            <p className="sr-only">
              {dimension.label}: {valueLabel}
              {assessed ? " out of 100" : ""}
            </p>
            <p className="type-caption mt-2 text-ink-muted">{dimension.explanation}</p>
            {dimension.status === "NOT_ASSESSED" ? (
              <p className="type-caption mt-1 text-ink-muted">
                Not assessed is not a score of 0.
              </p>
            ) : (
              <p className="type-caption mt-1 text-ink-muted">
                {dimension.evidence_summary}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
