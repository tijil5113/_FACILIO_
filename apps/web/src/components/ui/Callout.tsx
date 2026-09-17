import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface CalloutProps {
  tone?: "neutral" | "warning" | "danger" | "info" | "success";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

const tones = {
  neutral: "border-line bg-surface",
  warning: "border-warning/40 bg-warning-soft",
  danger: "border-danger/40 bg-danger-soft",
  info: "border-line bg-accent-soft",
  success: "border-success/40 bg-success-soft",
} as const;

const markers = {
  neutral: "text-ink-muted",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-accent",
  success: "text-success",
} as const;

export function Callout({ tone = "neutral", title, children, action }: CalloutProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-[var(--facilio-radius-md)] border px-4 py-3 transition-[background-color,border-color] duration-[var(--facilio-duration-fast)] ease-[var(--facilio-ease)]",
        tones[tone],
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", markers[tone])}
          style={{ background: "currentColor" }}
          aria-hidden="true"
        />
        <div>
          <p className="type-card-title text-ink">{title}</p>
          {children ? (
            <div className="type-body mt-1 text-ink-secondary">{children}</div>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
