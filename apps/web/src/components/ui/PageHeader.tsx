import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  titleId?: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  titleId,
  description,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl min-w-0">
        {eyebrow ? <p className="type-meta text-ink-muted">{eyebrow}</p> : null}
        <h1 id={titleId} className={cn("type-page-title text-ink", eyebrow && "mt-1")}>
          {title}
        </h1>
        {description ? (
          <p className="type-body mt-2 text-ink-secondary">{description}</p>
        ) : null}
        {meta ? <div className="type-caption mt-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
