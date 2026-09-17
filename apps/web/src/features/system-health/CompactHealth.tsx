import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Tooltip } from "@/components/ui/Tooltip";
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
  const quiet = presentation.label === "Healthy" || presentation.label === "Checking";

  return (
    <Tooltip label={presentation.detail} side="bottom">
      <span className="inline-flex min-h-8 items-center px-1">
        <StatusIndicator
          label={presentation.label}
          tone={presentation.tone}
          compact
          pulse={presentation.label === "Checking"}
          hideLabel={quiet}
          description={presentation.detail}
        />
      </span>
    </Tooltip>
  );
}
