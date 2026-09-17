import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { SystemHealthPanel } from "@/features/system-health/SystemHealthPanel";
import { compactHealthFromChecks } from "@/features/system-health/compact-health";

export function DegradedHome({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="max-w-2xl space-y-5">
      <h1 className="type-display text-ink">
        FACILIO can’t load your workspace right now.
      </h1>
      <Callout
        tone="danger"
        title="Some actions are unavailable"
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        <p>{message}</p>
        <p className="mt-1">
          Your interface is available, but datasets, upload, and analysis may not load
          until the data service responds.
        </p>
      </Callout>
      <TechnicalDetails>
        <SystemHealthPanel />
      </TechnicalDetails>
    </section>
  );
}

export function LimitedServiceNotice({
  presentation,
  onRetry,
}: {
  presentation: ReturnType<typeof compactHealthFromChecks>;
  onRetry: () => void;
}) {
  if (presentation.label !== "Limited") {
    return null;
  }
  return (
    <Callout
      tone="warning"
      title="Some cleanup actions are temporarily unavailable"
      action={
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      <p>You can still upload, analyze, and review data.</p>
    </Callout>
  );
}

export function HomeLoadingState() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading Home">
      <div className="home-welcome">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-16 w-full max-w-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <Skeleton className="hidden h-56 w-full lg:block" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
