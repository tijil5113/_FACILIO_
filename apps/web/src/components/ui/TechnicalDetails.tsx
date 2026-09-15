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
      <summary className="cursor-pointer text-sm font-medium text-ink">{summary}</summary>
      <div className="mt-3 text-sm leading-6 text-ink-secondary">{children}</div>
    </details>
  );
}
