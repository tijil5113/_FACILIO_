import { Skeleton } from "@/components/ui/Skeleton";

export function RouteFallback() {
  return (
    <div className="mx-auto max-w-5xl space-y-4" role="status" aria-label="Loading page">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
