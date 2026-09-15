import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "div";
  padded?: boolean;
}

export function Card({
  as: Component = "section",
  padded = true,
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-[var(--facilio-radius-md)] border border-line bg-surface",
        padded && "px-5 py-5",
        className,
      )}
      {...props}
    />
  );
}
