import type { ReactNode } from "react";

interface TechnicalDetailsProps {
  children: ReactNode;
  summary?: string;
}

export function TechnicalDetails({
  children,
  summary = "Technical details",
}: TechnicalDetailsProps) {
  return (
    <details className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3">
      <summary className="type-card-title cursor-pointer text-ink">{summary}</summary>
      <div className="type-body-sm mt-3 space-y-2 text-ink-secondary">{children}</div>
    </details>
  );
}
