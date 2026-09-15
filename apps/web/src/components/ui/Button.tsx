import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--facilio-radius-md)] font-medium transition-[background-color,border-color,color,opacity] duration-[var(--facilio-duration-fast)] ease-[var(--facilio-ease)]",
        "disabled:pointer-events-none disabled:border-line disabled:bg-subtle disabled:text-ink-muted",
        size === "sm" && "h-8 min-h-8 px-2.5 text-xs",
        size === "md" && "h-9 min-h-9 px-3 text-sm",
        variant === "primary" &&
          "border border-ink bg-ink text-canvas hover:bg-ink/90 active:bg-ink dark:text-[#121410]",
        variant === "secondary" &&
          "border border-line bg-surface text-ink hover:bg-subtle active:bg-subtle",
        variant === "ghost" &&
          "border border-transparent text-ink hover:bg-subtle active:bg-subtle",
        variant === "danger" &&
          "border border-danger bg-danger text-canvas hover:bg-danger/90 active:bg-danger dark:text-[#121410]",
        className,
      )}
      {...props}
    />
  );
}
