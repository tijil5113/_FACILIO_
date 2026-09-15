import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusIndicator, type StatusTone } from "@/components/ui/StatusIndicator";
import { useHealthQuery, useReadinessQuery } from "@/hooks/use-system-status";
import { useOperationsHealthQuery } from "@/features/jobs/queries";
import type { DependencyStatus } from "@/types/api";

function databasePresentation(status: DependencyStatus | "unknown" | "checking"): {
  label: string;
  tone: StatusTone;
} {
  if (status === "ready") return { label: "Ready", tone: "success" };
  if (status === "not_configured") return { label: "Not configured", tone: "warning" };
  if (status === "unavailable") return { label: "Unavailable", tone: "danger" };
  if (status === "checking") return { label: "Checking", tone: "info" };
  return { label: "Unknown", tone: "neutral" };
}

export function SystemHealthPanel() {
  const health = useHealthQuery();
  const readiness = useReadinessQuery();
  const operations = useOperationsHealthQuery();

  const retry = () => {
    void health.refetch();
    void readiness.refetch();
  };

  const apiOperational = health.isSuccess;
  const databaseCheck = readiness.data?.checks.database;
  const databaseStatus = readiness.isPending
    ? "checking"
    : readiness.isError
      ? "unavailable"
      : databaseCheck === undefined
        ? "unknown"
        : databaseCheck.status;
  const version = health.data?.version;
  const service = health.data?.service;
  const clientMode = import.meta.env.MODE;

  return (
    <Card as="section" padded={false} aria-labelledby="system-status-heading">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id="system-status-heading" className="text-sm font-medium">
          System status
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={retry}
          disabled={health.isFetching}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Retry
        </Button>
      </div>

      <div className="px-5 py-5">
        {health.isLoading ? (
          <div className="space-y-3" role="status">
            <p className="text-sm text-ink-muted">Checking system status…</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : null}

        {health.isError ? (
          <div role="alert">
            <Callout
              tone="danger"
              title="API unavailable"
              action={
                <Button variant="secondary" size="sm" onClick={retry}>
                  Retry
                </Button>
              }
            >
              FACILIO’s interface is available, but live system status could not be
              retrieved. Database status cannot be confirmed until the API responds.
            </Callout>
          </div>
        ) : null}

        {apiOperational ? (
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
                API
              </dt>
              <dd className="mt-2">
                <StatusIndicator label="Operational" tone="success" />
              </dd>
              {service ? (
                <p className="mt-1 font-mono text-xs text-ink-muted">{service}</p>
              ) : null}
              {version ? (
                <p className="mt-1 font-mono text-xs text-ink-muted">{version}</p>
              ) : null}
            </div>
            <div>
              <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
                Database
              </dt>
              <dd className="mt-2">
                <StatusIndicator {...databasePresentation(databaseStatus)} />
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
                Queue
              </dt>
              <dd className="mt-2">
                <StatusIndicator
                  {...databasePresentation(
                    readiness.data?.checks.queue?.status ??
                      operations.data?.queue.status ??
                      "unknown",
                  )}
                />
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
                Worker
              </dt>
              <dd className="mt-2">
                <StatusIndicator
                  label={
                    operations.data?.worker.status === "available"
                      ? "Available"
                      : operations.isPending
                        ? "Checking"
                        : "Unavailable"
                  }
                  tone={
                    operations.data?.worker.status === "available" ? "success" : "warning"
                  }
                />
              </dd>
            </div>
          </dl>
        ) : null}

        {apiOperational ? (
          <p className="mt-5 font-mono text-[11px] text-ink-muted">
            Runtime mode: {clientMode}
            {version ? ` · ${version}` : ""}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
