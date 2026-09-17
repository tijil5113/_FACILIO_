import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    "type-button inline-flex items-center justify-center gap-2 rounded-[var(--facilio-radius-md)] transition-[background-color,border-color,color] duration-[var(--facilio-duration-control)] ease-[var(--facilio-ease)]",
    "disabled:pointer-events-none disabled:border-line disabled:bg-subtle disabled:text-ink-disabled",
    size === "sm" && "h-8 min-h-8 px-2.5 text-xs md:min-h-8",
    size === "md" && "h-9 min-h-9 px-3 md:min-h-9",
    variant === "primary" &&
      "border border-ink bg-ink text-canvas hover:bg-ink/90 active:bg-ink/80",
    variant === "secondary" &&
      "border border-line bg-surface text-ink hover:bg-subtle active:bg-surface-interactive",
    variant === "ghost" &&
      "border border-transparent text-ink hover:bg-subtle active:bg-surface-interactive",
    variant === "danger" &&
      "border border-danger bg-danger text-canvas hover:bg-danger/90 active:bg-danger/80",
    className,
  );
}
