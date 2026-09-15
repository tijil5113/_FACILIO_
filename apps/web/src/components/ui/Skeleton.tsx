import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      className={cn(
        "skeleton-pulse inline-block rounded-[var(--facilio-radius-sm)]",
        className,
      )}
      aria-hidden="true"
    />
  );
}
