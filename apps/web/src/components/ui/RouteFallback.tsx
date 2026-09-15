import { Skeleton } from "@/components/ui/Skeleton";

export function RouteFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-4" role="status" aria-label="Loading page">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-32 w-full" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
