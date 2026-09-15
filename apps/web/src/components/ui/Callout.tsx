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
  warning: "border-warning/30 bg-warning-soft",
  danger: "border-danger/30 bg-danger-soft",
  info: "border-info/30 bg-info-soft",
  success: "border-success/30 bg-success-soft",
} as const;

export function Callout({ tone = "neutral", title, children, action }: CalloutProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-[var(--facilio-radius-md)] border px-4 py-3 transition-[background-color,border-color] duration-[var(--facilio-duration-fast)] ease-[var(--facilio-ease)]",
        tones[tone],
      )}
    >
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {children ? (
          <div className="mt-1 text-sm leading-6 text-ink-secondary">{children}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
