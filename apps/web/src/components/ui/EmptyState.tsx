import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  summary: string;
  detail?: string;
  upcoming?: boolean;
  visual?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({
  title,
  summary,
  detail,
  upcoming = false,
  visual,
  children,
}: EmptyStateProps) {
  return (
    <section className="page-enter mx-auto max-w-3xl">
      {upcoming ? (
        <div className="mb-3">
          <Badge tone="accent">Upcoming</Badge>
        </div>
      ) : null}
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">{summary}</p>
      {detail ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{detail}</p>
      ) : null}
      {visual ? (
        <div
          className={cn(
            "mt-8 rounded-[var(--facilio-radius-md)] border border-line bg-surface p-6",
          )}
        >
          {visual}
        </div>
      ) : null}
      {children}
    </section>
  );
}
