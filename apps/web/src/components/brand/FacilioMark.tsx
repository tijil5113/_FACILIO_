import { cn } from "@/lib/cn";

interface FacilioMarkProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: 20,
  md: 24,
  lg: 40,
  xl: 48,
} as const;

export function FacilioMark({ size = "md", className }: FacilioMarkProps) {
  const px = sizes[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="4" className="fill-accent" />
      <path
        d="M9 8.5h13.5v2.3H11.4v3.7h9.4v2.2h-9.4V23.5H9V8.5z"
        className="fill-raised"
      />
    </svg>
  );
}

interface FacilioWordmarkProps {
  compact?: boolean;
  className?: string;
}

export function FacilioWordmark({ compact = false, className }: FacilioWordmarkProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <FacilioMark size="sm" />
      <div className="min-w-0">
        <p className="font-sans text-[13px] font-semibold tracking-[0.14em] text-sidebar-ink">
          FACILIO
        </p>
        {compact ? null : (
          <p className="truncate font-mono text-[10px] tracking-[0.12em] text-sidebar-muted uppercase">
            Data operations
          </p>
        )}
      </div>
    </div>
  );
}
