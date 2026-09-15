import { StatusIndicator, type StatusTone } from "@/components/ui/StatusIndicator";
import { useHealthQuery, useReadinessQuery } from "@/hooks/use-system-status";

export function CompactHealth() {
  const health = useHealthQuery();
  const readiness = useReadinessQuery();

  let label = "Checking";
  let tone: StatusTone = "info";

  if (health.isError) {
    label = "Unavailable";
    tone = "danger";
  } else if (
    health.isSuccess &&
    readiness.data?.checks.database?.status === "unavailable"
  ) {
    label = "Degraded";
    tone = "warning";
  } else if (health.isSuccess) {
    label = "Healthy";
    tone = "success";
  }

  return (
    <div className="flex items-center" title="Live system status from the FACILIO API">
      <StatusIndicator
        label={label}
        tone={tone}
        compact
        pulse={label === "Checking"}
        description="Live system status from the FACILIO API"
      />
    </div>
  );
}
