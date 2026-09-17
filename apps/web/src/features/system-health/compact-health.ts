import type { StatusTone } from "@/components/ui/StatusIndicator";

export function compactHealthFromChecks(args: {
  healthError: boolean;
  healthSuccess: boolean;
  databaseStatus?: string;
  queueStatus?: string;
  workerStatus?: string;
}): { label: string; tone: StatusTone; detail: string } {
  if (args.healthError) {
    return {
      label: "Unavailable",
      tone: "danger",
      detail: "The FACILIO API did not respond.",
    };
  }
  if (args.databaseStatus === "unavailable") {
    return {
      label: "Unavailable",
      tone: "danger",
      detail: "The database is not reachable.",
    };
  }
  const workerDown = args.workerStatus === "unavailable";
  const queueDown = args.queueStatus === "unavailable";
  if (args.healthSuccess && (workerDown || queueDown)) {
    return {
      label: "Limited",
      tone: "warning",
      detail: "Background processing is unavailable. Saved Cleanups cannot run.",
    };
  }
  if (args.healthSuccess) {
    return {
      label: "Healthy",
      tone: "success",
      detail: "Live system status from the FACILIO API",
    };
  }
  return {
    label: "Checking",
    tone: "info",
    detail: "Checking system status",
  };
}
