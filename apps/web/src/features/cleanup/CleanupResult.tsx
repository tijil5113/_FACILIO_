import { Button } from "@/components/ui/Button";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { QualityDeltaBlock } from "@/features/transform/HistoryPanel";
import { formatCount } from "@/lib/format";
import { versionHeadline } from "@/lib/version-labels";
import type { CleanupApplyResult, CleanupStep } from "@/types/cleanup";

interface CleanupResultProps {
  result: CleanupApplyResult;
  steps: CleanupStep[];
  onCompare: () => void;
  onOpenData: () => void;
  onSave: () => void;
  onDone: () => void;
  onRetryProfile: () => void;
  profiling: boolean;
}

export function CleanupResult({
  result,
  steps,
  onCompare,
  onOpenData,
  onSave,
  onDone,
  onRetryProfile,
  profiling,
}: CleanupResultProps) {
  const output = result.output_version_number ?? result.input_version_number + 1;
  const profileFailed = result.profile_status === "FAILED";
  return (
    <section className="space-y-5" aria-labelledby="cleanup-complete">
      <h2 id="cleanup-complete" className="text-lg font-semibold tracking-tight text-ink">
        Cleanup complete
      </h2>
      <p className="text-sm leading-6 text-ink-secondary" role="status">
        FACILIO created {versionHeadline({ version_number: output, kind: "DERIVED" })}.
        Your original{" "}
        {versionHeadline({
          version_number: result.input_version_number,
          kind: "ORIGINAL",
        })}{" "}
        is still available.
      </p>
      {result.impact ? (
        <ul className="space-y-1 text-sm text-ink-secondary">
          <li>{formatCount(result.impact.changed_cell_count)} values cleaned</li>
          {result.impact.removed_row_count > 0 ? (
            <li>{formatCount(result.impact.removed_row_count)} rows removed</li>
          ) : null}
          <li>{formatCount(steps.length)} cleanup steps in this version</li>
        </ul>
      ) : null}
      {result.quality_delta ? <QualityDeltaBlock delta={result.quality_delta} /> : null}
      {profileFailed ? (
        <RecoveryMessage
          experience={{
            title: "Cleanup complete",
            explanation: "Your cleaned version was created successfully.",
            consequence: "FACILIO couldn't finish analyzing the new version.",
            severity: "warning",
            retrySafe: true,
            learnHref: "/learn#data",
            learnLabel: "What Analyze does",
            action: "Analyze cleaned version",
            resourceId: result.output_version_id ?? undefined,
            dataSafety: "partial-analysis",
            code: "PROFILE_FAILED",
          }}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={onOpenData}>
                Open cleaned data
              </Button>
              <Button size="sm" onClick={onRetryProfile} disabled={profiling}>
                Try analysis again
              </Button>
            </div>
          }
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onOpenData}>Open cleaned data</Button>
        <Button variant="secondary" onClick={onCompare}>
          Compare result
        </Button>
        <Button variant="secondary" onClick={onSave}>
          Save these steps
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Done
        </Button>
      </div>
      <TechnicalDetails>
        <p>Job {result.job.id}</p>
        <p>Run {result.workflow_run.id}</p>
        {result.output_version_id ? (
          <p>Output version {result.output_version_id}</p>
        ) : null}
      </TechnicalDetails>
    </section>
  );
}
