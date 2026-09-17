import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  summary: string;
  detail?: string;
  upcoming?: boolean;
  visual?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({
  title,
  summary,
  detail,
  upcoming = false,
  visual,
  actions,
  children,
}: EmptyStateProps) {
  return (
    <section className="page-enter mx-auto max-w-3xl">
      {upcoming ? (
        <p className="type-meta mb-3 text-ink-muted uppercase">Upcoming</p>
      ) : null}
      <h1 className="type-page-title text-ink">{title}</h1>
      <p className="type-body mt-2 max-w-2xl text-ink-secondary">{summary}</p>
      {detail ? (
        <p className="type-body mt-2 max-w-2xl text-ink-muted">{detail}</p>
      ) : null}
      {visual ? <div className="mt-8">{visual}</div> : null}
      {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
      {children ? <div className={cn(actions ? "mt-4" : "mt-6")}>{children}</div> : null}
    </section>
  );
}
