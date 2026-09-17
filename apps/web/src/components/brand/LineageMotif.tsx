import { cn } from "@/lib/cn";

export function LineageMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 28"
      width="72"
      height="28"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="6"
        width="20"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <rect
        x="5"
        y="10"
        width="12"
        height="2.5"
        rx="0.5"
        fill="currentColor"
        opacity="0.35"
      />
      <rect
        x="5"
        y="15"
        width="8"
        height="2.5"
        rx="0.5"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M24 14h10"
        stroke="currentColor"
        strokeWidth="1.5"
        markerEnd="none"
        opacity="0.7"
      />
      <path d="M32 11l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect
        x="37"
        y="6"
        width="20"
        height="16"
        rx="2"
        fill="currentColor"
        opacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="41"
        y="10"
        width="12"
        height="2.5"
        rx="0.5"
        fill="currentColor"
        opacity="0.7"
      />
      <rect
        x="41"
        y="15"
        width="8"
        height="2.5"
        rx="0.5"
        fill="currentColor"
        opacity="0.7"
      />
      <text
        x="62"
        y="18"
        fill="currentColor"
        fontSize="9"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        V2
      </text>
    </svg>
  );
}
