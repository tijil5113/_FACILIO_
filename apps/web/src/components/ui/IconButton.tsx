import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  pressed?: boolean;
}

export function IconButton({
  label,
  pressed,
  className,
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-[var(--facilio-radius-md)] text-ink-secondary transition-[background-color,color] duration-[var(--facilio-duration-control)] ease-[var(--facilio-ease)] hover:bg-subtle hover:text-ink active:bg-surface-interactive md:h-8 md:w-8",
        "disabled:pointer-events-none disabled:bg-transparent disabled:text-ink-disabled",
        pressed && "bg-subtle text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
