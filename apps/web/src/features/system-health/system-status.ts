import type { StatusTone } from "@/components/ui/StatusIndicator";
import type { DependencyStatus } from "@/types/api";
import type { OperationsHealth } from "@/types/jobs";

export type HumanAvailability = "Available" | "Limited" | "Unavailable" | "Checking";

const SECRET_PATTERN =
  /SECRET|TOKEN|PASSWORD|DATABASE_URL|REDIS_URL|CONNECTION STRING|postgres:\/\//i;

export function safeTechnicalMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }
  if (SECRET_PATTERN.test(message)) {
    return null;
  }
  return message;
}

export function humanDependencyStatus(
  status: DependencyStatus | "unknown" | "checking" | undefined,
): { label: HumanAvailability; tone: StatusTone } {
  if (status === "ready") return { label: "Available", tone: "success" };
  if (status === "not_configured") return { label: "Limited", tone: "warning" };
  if (status === "unavailable") return { label: "Unavailable", tone: "danger" };
  if (status === "checking") return { label: "Checking", tone: "info" };
  return { label: "Unavailable", tone: "neutral" };
}

export function backgroundProcessingPresentation(args: {
  pending: boolean;
  operations?: OperationsHealth;
  queueStatus?: DependencyStatus;
}): {
  label: HumanAvailability;
  tone: StatusTone;
  consequence: string | null;
  workerLabel: string;
  queueLabel: string;
  lastSeenAt: string | null;
  backend: string | null;
} {
  if (args.pending && !args.operations) {
    return {
      label: "Checking",
      tone: "info",
      consequence: null,
      workerLabel: "Checking",
      queueLabel: "Checking",
      lastSeenAt: null,
      backend: null,
    };
  }

  const workerStatus = args.operations?.worker.status;
  const queueStatus = args.operations?.queue.status ?? args.queueStatus;
  const workerDown = workerStatus === "unavailable" || workerStatus == null;
  const queueDown = queueStatus === "unavailable";

  if (workerDown || queueDown) {
    return {
      label: "Unavailable",
      tone: "warning",
      consequence:
        "Background processing is unavailable. You can still browse datasets, but saved Cleanups cannot start right now.",
      workerLabel: workerDown ? "Unavailable" : "Available",
      queueLabel: queueDown
        ? "Unavailable"
        : queueStatus === "ready"
          ? "Available"
          : "Limited",
      lastSeenAt: args.operations?.worker.last_seen_at ?? null,
      backend: args.operations?.queue.backend ?? null,
    };
  }

  return {
    label: "Available",
    tone: "success",
    consequence: null,
    workerLabel: "Available",
    queueLabel: queueStatus === "ready" ? "Available" : "Limited",
    lastSeenAt: args.operations?.worker.last_seen_at ?? null,
    backend: args.operations?.queue.backend ?? null,
  };
}

export function applicationPresentation(args: {
  healthSuccess: boolean;
  healthError: boolean;
  healthPending: boolean;
}): { label: HumanAvailability; tone: StatusTone; detail: string } {
  if (args.healthPending && !args.healthSuccess && !args.healthError) {
    return {
      label: "Checking",
      tone: "info",
      detail: "Checking whether the application can respond.",
    };
  }
  if (args.healthError) {
    return {
      label: "Unavailable",
      tone: "danger",
      detail: "The FACILIO application did not respond. Live status cannot be confirmed.",
    };
  }
  return {
    label: "Available",
    tone: "success",
    detail: "The FACILIO application is responding.",
  };
}
