import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { useOperationsHealthQuery } from "@/features/jobs/queries";
import { compactHealthFromChecks } from "@/features/system-health/compact-health";
import { useHealthQuery, useReadinessQuery } from "@/hooks/use-system-status";

export function CompactHealth() {
  const health = useHealthQuery();
  const readiness = useReadinessQuery();
  const operations = useOperationsHealthQuery();
  const presentation = compactHealthFromChecks({
    healthError: health.isError,
    healthSuccess: health.isSuccess,
    databaseStatus: readiness.data?.checks.database?.status,
    queueStatus: operations.data?.queue.status,
    workerStatus: operations.data?.worker.status,
  });

  return (
    <div className="flex items-center" title={presentation.detail}>
      <StatusIndicator
        label={presentation.label}
        tone={presentation.tone}
        compact
        pulse={presentation.label === "Checking"}
        description={presentation.detail}
      />
    </div>
  );
}
