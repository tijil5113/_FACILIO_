import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { useJobQuery } from "@/features/jobs/queries";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { humanStepFromWorkflow } from "@/features/workflows/step-language";
import { activityOutcome } from "@/lib/activity-outcome";
import { VersionLabel } from "@/components/ui/VersionLabel";
import type { DatasetSummary } from "@/types/dataset";
import type { DatasetVersion } from "@/types/transformations";
import { isActiveJobStatus } from "@/types/jobs";
import type {
  WorkflowDetail,
  WorkflowPreview,
  WorkflowValidation,
} from "@/types/workflows";
import type { WorkflowRunAccepted } from "@/services/workflows";

interface RunCleanupDialogProps {
  open: boolean;
  workflow: WorkflowDetail;
  datasets: DatasetSummary[];
  versions: DatasetVersion[];
  datasetId: string;
  versionId: string;
  validation: WorkflowValidation | null | undefined;
  preview: WorkflowPreview | null;
  previewPending: boolean;
  previewError: unknown;
  runPending: boolean;
  runError: unknown;
  runResult: WorkflowRunAccepted | null;
  workerAvailable: boolean | null;
  queueUnavailable: boolean;
  onDatasetChange: (datasetId: string) => void;
  onVersionChange: (versionId: string) => void;
  onPreview: () => void;
  onRun: () => void;
  onClose: () => void;
}

export function RunCleanupDialog({
  open,
  workflow,
  datasets,
  versions,
  datasetId,
  versionId,
  validation,
  preview,
  previewPending,
  previewError,
  runPending,
  runError,
  runResult,
  workerAvailable,
  queueUnavailable,
  onDatasetChange,
  onVersionChange,
  onPreview,
  onRun,
  onClose,
}: RunCleanupDialogProps) {
  const selectedDataset = datasets.find((item) => item.id === datasetId);
  const selectedVersion = versions.find((item) => item.id === versionId);
  const enabledSteps = workflow.steps.filter((step) => step.enabled);
  const incompatible = Boolean(
    validation?.compatibility && !validation.compatibility.compatible,
  );
  const workerDown = workerAvailable === false || queueUnavailable;
  const liveJob = useJobQuery(runResult?.job.id);
  const acceptedJob = liveJob.data ?? runResult?.job ?? null;
  const runInFlight = Boolean(
    runPending || (acceptedJob && isActiveJobStatus(acceptedJob.status)),
  );
  const canRun =
    Boolean(datasetId && versionId) &&
    validation?.valid === true &&
    !preview?.no_op &&
    workflow.status !== "ARCHIVED" &&
    !runInFlight;

  return (
    <Dialog
      open={open}
      title="Run Cleanup"
      description="Review the target dataset before running this Cleanup."
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-4 p-5">
        <div>
          <h2 className="type-card-title text-ink">Run Cleanup</h2>
          <p className="type-body mt-1 text-ink-secondary">
            This runs in the background. If it finishes, FACILIO adds one cleaned version.
            Your original stays unchanged.
          </p>
        </div>

        <dl className="cleanup-run-review type-body-sm text-ink-secondary">
          <div>
            <dt className="type-meta text-ink-muted">Cleanup</dt>
            <dd className="mt-1 text-ink">{workflow.name}</dd>
          </div>
          <div>
            <dt className="type-meta text-ink-muted">Steps</dt>
            <dd className="mt-1 text-ink">
              {enabledSteps.length} {enabledSteps.length === 1 ? "step" : "steps"}
            </dd>
          </div>
        </dl>

        <Select
          id="run-dataset"
          label="Target dataset"
          value={datasetId}
          onChange={(event) => {
            onDatasetChange(event.target.value);
          }}
        >
          <option value="">Select a dataset</option>
          {datasets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select
          id="run-version"
          label="Source version"
          value={versionId}
          disabled={!datasetId}
          onChange={(event) => {
            onVersionChange(event.target.value);
          }}
        >
          <option value="">Select a version</option>
          {versions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.is_current
                ? `V${String(item.version_number)} — Using this version`
                : `V${String(item.version_number)}`}
            </option>
          ))}
        </Select>

        {selectedDataset && selectedVersion ? (
          <p className="type-body-sm text-ink-secondary">
            {selectedDataset.name} · <VersionLabel version={selectedVersion} />
          </p>
        ) : (
          <p className="type-body-sm text-ink-muted">
            Choose a dataset and version. Compatibility is checked after you select them.
          </p>
        )}

        {incompatible ? (
          <Callout tone="danger" title="This Cleanup doesn't match this version">
            <ul className="mt-1 list-disc pl-4">
              {validation?.compatibility?.reasons.map((reason) => (
                <li key={`${reason.code}-${reason.message}`}>
                  {humanCompatibility(reason.message, reason.column)}
                </li>
              ))}
            </ul>
          </Callout>
        ) : validation?.compatibility?.compatible ? (
          <p className="type-body-sm text-ink-secondary">
            These steps can run on the selected version.
          </p>
        ) : null}

        <section>
          <h3 className="type-meta text-ink-muted">Cleaning steps</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
            {enabledSteps.map((step) => (
              <li key={step.id}>{humanStepFromWorkflow(step)}</li>
            ))}
          </ol>
        </section>

        {workerDown ? (
          <Callout tone="warning" title="Cleanup can't start right now">
            FACILIO's background processing service is unavailable. Your data has not been
            changed.
          </Callout>
        ) : null}

        {preview?.no_op ? (
          <Callout tone="info" title="These steps wouldn't change this version">
            FACILIO will not create an identical cleaned version.
          </Callout>
        ) : null}

        {preview ? (
          <p className="type-body-sm text-ink-secondary">
            Preview: {String(preview.rows_before)} → {String(preview.rows_after)} rows.
            Nothing is saved until you run the Cleanup.
          </p>
        ) : null}

        {previewError ? (
          <RecoveryMessage
            experience={mapRecoveryError(previewError, {
              operation: "preview",
              action: "Preview cleanup",
            })}
          />
        ) : null}
        {runError ? (
          <RecoveryMessage
            experience={mapRecoveryError(runError, {
              operation: "workflow-run",
              action: "Run cleanup",
            })}
          />
        ) : null}

        {acceptedJob ? (
          <RunOutcome job={acceptedJob} workerAvailable={workerAvailable !== false} />
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            disabled={
              !datasetId || !versionId || previewPending || workflow.status === "ARCHIVED"
            }
            onClick={onPreview}
          >
            {previewPending ? "Previewing…" : "Preview changes"}
          </Button>
          <Button disabled={!canRun || workerDown} onClick={onRun}>
            {runPending ? "Starting…" : "Run Cleanup"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function humanCompatibility(message: string, column: string | null): string {
  if (column && /does not contain|missing/i.test(message)) {
    return `This Cleanup expects a column named ${column}, but this version does not contain it.`;
  }
  return message;
}

function RunOutcome({
  job,
  workerAvailable,
}: {
  job: WorkflowRunAccepted["job"];
  workerAvailable: boolean;
}) {
  const outcome = activityOutcome(job, { workerAvailable });
  if (outcome.kind === "waiting") {
    return (
      <Callout
        tone="info"
        title="Waiting"
        action={
          <ButtonLink variant="secondary" size="sm" to={`/jobs/${job.id}`}>
            View Activity
          </ButtonLink>
        }
      >
        FACILIO is waiting to start this Cleanup. Your original data is unchanged.
      </Callout>
    );
  }
  if (outcome.kind === "worker_unavailable") {
    return (
      <Callout
        tone="warning"
        title="Cleanup can't start right now"
        action={
          <ButtonLink variant="secondary" size="sm" to={`/jobs/${job.id}`}>
            View Activity
          </ButtonLink>
        }
      >
        FACILIO's background processing service is unavailable. Your data has not been
        changed.
      </Callout>
    );
  }
  if (outcome.kind === "failed" || job.status === "FAILED") {
    return (
      <Callout
        tone="danger"
        title={outcome.headline}
        action={
          <ButtonLink variant="secondary" size="sm" to={`/jobs/${job.id}`}>
            View Activity
          </ButtonLink>
        }
      >
        {outcome.detail} Your source version remains available.
      </Callout>
    );
  }
  if (outcome.hasOutput) {
    return (
      <Callout
        tone={outcome.analysisNeedsAttention ? "warning" : "success"}
        title={outcome.headline}
      >
        <p>{outcome.detail}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {job.dataset_id && job.output_version_id ? (
            <ButtonLink
              size="sm"
              to={`/datasets/${job.dataset_id}?version=${job.output_version_id}`}
            >
              Open version
            </ButtonLink>
          ) : null}
          <ButtonLink variant="secondary" size="sm" to={`/jobs/${job.id}`}>
            View Activity
          </ButtonLink>
        </div>
      </Callout>
    );
  }
  return (
    <Callout
      tone="info"
      title={outcome.headline}
      action={
        <ButtonLink variant="secondary" size="sm" to={`/jobs/${job.id}`}>
          View Activity
        </ButtonLink>
      }
    >
      {outcome.detail}
    </Callout>
  );
}
