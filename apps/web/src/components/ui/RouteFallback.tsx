import { Skeleton } from "@/components/ui/Skeleton";

export function RouteFallback() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
        <Skeleton className="h-8 w-full rounded-none" />
        <Skeleton className="mt-px h-8 w-full rounded-none" />
        <Skeleton className="mt-px h-8 w-full rounded-none" />
        <Skeleton className="mt-px h-8 w-full rounded-none" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
