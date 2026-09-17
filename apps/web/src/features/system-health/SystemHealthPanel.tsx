import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { useHealthQuery, useReadinessQuery } from "@/hooks/use-system-status";
import { useOperationsHealthQuery } from "@/features/jobs/queries";
import {
  applicationPresentation,
  backgroundProcessingPresentation,
  humanDependencyStatus,
  safeTechnicalMessage,
} from "@/features/system-health/system-status";

export function SystemHealthPanel() {
  const health = useHealthQuery();
  const readiness = useReadinessQuery();
  const operations = useOperationsHealthQuery();

  const refresh = () => {
    void health.refetch();
    void readiness.refetch();
    void operations.refetch();
  };

  const application = applicationPresentation({
    healthSuccess: health.isSuccess,
    healthError: health.isError,
    healthPending: health.isPending,
  });
  const databaseCheck = readiness.data?.checks.database;
  const databaseStatus = readiness.isPending
    ? "checking"
    : readiness.isError
      ? "unavailable"
      : databaseCheck === undefined
        ? "unknown"
        : databaseCheck.status;
  const database = humanDependencyStatus(databaseStatus);
  const processing = backgroundProcessingPresentation({
    pending: operations.isPending,
    operations: operations.data,
    queueStatus: readiness.data?.checks.queue?.status,
  });
  const databaseMessage = safeTechnicalMessage(databaseCheck?.message);
  const fetching = health.isFetching || readiness.isFetching || operations.isFetching;

  return (
    <Card as="section" padded={false} aria-labelledby="system-status-heading">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 id="system-status-heading" className="text-sm font-medium">
          System status
        </h2>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={fetching}>
          <RefreshCw size={14} aria-hidden="true" />
          Refresh status
        </Button>
      </div>

      <div className="space-y-5 px-5 py-5">
        {health.isLoading ? (
          <div className="space-y-3" role="status">
            <p className="text-sm text-ink-muted">Checking system status…</p>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}

        {health.isError ? (
          <div role="alert">
            <Callout
              tone="danger"
              title="Application unavailable"
              action={
                <Button variant="secondary" size="sm" onClick={refresh}>
                  Refresh status
                </Button>
              }
            >
              FACILIO’s interface is available, but live system status could not be
              retrieved. Database and background processing cannot be confirmed until the
              application responds.
            </Callout>
          </div>
        ) : null}

        {health.isSuccess || !health.isLoading ? (
          <ul className="space-y-4">
            <li className="rounded-[var(--facilio-radius-md)] border border-line bg-subtle px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Application</p>
                <StatusIndicator label={application.label} tone={application.tone} />
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                {application.detail}
              </p>
            </li>
            <li className="rounded-[var(--facilio-radius-md)] border border-line bg-subtle px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Database</p>
                <StatusIndicator label={database.label} tone={database.tone} />
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                {database.label === "Available"
                  ? "Saved datasets and versions can be loaded."
                  : database.label === "Checking"
                    ? "Checking whether saved data can be reached."
                    : "Saved data isn’t available right now."}
              </p>
            </li>
            <li className="rounded-[var(--facilio-radius-md)] border border-line bg-subtle px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Background processing</p>
                <StatusIndicator label={processing.label} tone={processing.tone} />
              </div>
              {processing.consequence ? (
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  {processing.consequence}
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  Saved Cleanups can start in the background.
                </p>
              )}
            </li>
          </ul>
        ) : null}

        <TechnicalDetails>
          <dl className="space-y-2 font-mono text-xs text-ink-secondary">
            {health.data?.service ? (
              <div>
                <dt className="text-ink-muted">Service</dt>
                <dd>{health.data.service}</dd>
              </div>
            ) : null}
            {health.data?.version ? (
              <div>
                <dt className="text-ink-muted">API version</dt>
                <dd>{health.data.version}</dd>
              </div>
            ) : null}
            {databaseMessage ? (
              <div>
                <dt className="text-ink-muted">Database</dt>
                <dd>{databaseMessage}</dd>
              </div>
            ) : (
              <div>
                <dt className="text-ink-muted">Database</dt>
                <dd>{database.label}</dd>
              </div>
            )}
            {processing.backend ? (
              <div>
                <dt className="text-ink-muted">Queue</dt>
                <dd>
                  {processing.backend === "redis" ? "Redis / RQ" : processing.backend}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-ink-muted">Worker</dt>
              <dd>{processing.workerLabel}</dd>
            </div>
            {processing.lastSeenAt ? (
              <div>
                <dt className="text-ink-muted">Worker last seen</dt>
                <dd>{processing.lastSeenAt}</dd>
              </div>
            ) : null}
          </dl>
        </TechnicalDetails>
      </div>
    </Card>
  );
}
