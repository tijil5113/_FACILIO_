import { cn } from "@/lib/cn";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

interface StatusIndicatorProps {
  label: string;
  tone?: StatusTone;
  description?: string;
  compact?: boolean;
  pulse?: boolean;
}

const dots: Record<StatusTone, string> = {
  neutral: "bg-ink-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export function StatusIndicator({
  label,
  tone = "neutral",
  description,
  compact = false,
  pulse = false,
}: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", compact && "gap-1.5")}>
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          dots[tone],
          pulse && "status-pulse",
        )}
        aria-hidden="true"
      />
      <span className={cn("text-sm text-ink", compact && "text-xs")}>{label}</span>
      {description ? <span className="sr-only">{description}</span> : null}
    </span>
  );
}
