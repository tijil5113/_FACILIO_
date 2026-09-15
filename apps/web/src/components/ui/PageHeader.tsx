import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  titleId?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  titleId,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-xs text-ink-muted">{eyebrow}</p> : null}
        <h1
          id={titleId}
          className="mt-1 text-[22px] font-semibold tracking-tight text-ink"
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}
