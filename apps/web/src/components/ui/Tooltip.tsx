import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "right" | "bottom";
}

export function Tooltip({ label, children, side = "right" }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 py-1 text-xs text-ink shadow-[var(--facilio-shadow)] group-hover:block group-focus-within:block",
          side === "right" && "top-1/2 left-full ml-2 -translate-y-1/2",
          side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}
