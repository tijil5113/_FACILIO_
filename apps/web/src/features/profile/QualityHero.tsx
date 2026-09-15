import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { formatScore } from "@/lib/format";
import type { QualitySummary } from "@/types/profile";

interface QualityHeroProps {
  quality: QualitySummary;
}

export function QualityHero({ quality }: QualityHeroProps) {
  const assessed = quality.overall_status === "ASSESSED";
  const score = quality.overall_score;
  const ratio = assessed && score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const circumference = 2 * Math.PI * 54;
  const dash = circumference * ratio;

  return (
    <section
      className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-5 py-6 sm:px-8"
      aria-label="Data quality"
    >
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
            Data quality
          </p>
          <p className="mt-2 font-mono text-5xl font-semibold tracking-tight text-ink tabular-nums">
            {assessed ? formatScore(score) : "—"}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {assessed ? (quality.grade ?? "Assessed") : "Not assessed"}
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-muted">
            {quality.assessed_count === 1
              ? "1 dimension assessed"
              : `${String(quality.assessed_count)} dimensions assessed`}
            {quality.not_assessed_count
              ? ` · ${String(quality.not_assessed_count)} not assessed`
              : ""}
            . Equal weighting of assessed dimensions only.
          </p>
          <p className="mt-3">
            <LearnMoreLink to="/learn#quality">What does this score mean?</LearnMoreLink>
          </p>
        </div>
        <div className="relative h-36 w-36 shrink-0" aria-hidden={!assessed}>
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img">
            <title>
              {assessed
                ? `Overall quality ${formatScore(score)} out of 100`
                : "Overall quality not assessed"}
            </title>
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              className="stroke-line"
              strokeWidth="8"
            />
            {assessed ? (
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                className="stroke-ink"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${String(dash)} ${String(circumference)}`}
              />
            ) : (
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                className="stroke-line-strong"
                strokeWidth="8"
                strokeDasharray="6 8"
              />
            )}
          </svg>
        </div>
      </div>
    </section>
  );
}
