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

export function TableSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--facilio-radius-md)] border border-line",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className="h-8 w-full rounded-none" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="mt-px h-8 w-full rounded-none" />
      ))}
    </div>
  );
}
