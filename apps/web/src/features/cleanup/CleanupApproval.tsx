import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { formatCount } from "@/lib/format";
import { versionHeadline } from "@/lib/version-labels";
import type { CleanupPreview, CleanupStep, GuidedRecommendation } from "@/types/cleanup";

import { humanStep } from "./plan-state";

interface CleanupApprovalProps {
  preview: CleanupPreview;
  steps: CleanupStep[];
  recommendations: GuidedRecommendation[];
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirming: boolean;
}

export function CleanupApproval({
  preview,
  steps,
  recommendations,
  acknowledged,
  onAcknowledge,
  onBack,
  onConfirm,
  confirming,
}: CleanupApprovalProps) {
  const outputNumber = preview.input_version_number + 1;
  const needsAck = preview.high_impact;
  return (
    <section className="space-y-4" aria-label="Approval">
      <p className="text-sm leading-6 text-ink-secondary">FACILIO will:</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
        {steps.map((step) => {
          const rec = recommendations.find(
            (item) => item.recommendation_id === step.recommendation_id,
          );
          return (
            <li key={`${step.operation_code}-${JSON.stringify(step.parameters)}`}>
              {humanStep(step, rec)}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-ink">
        This will create{" "}
        {versionHeadline({ version_number: outputNumber, kind: "DERIVED" })}.
      </p>
      <p className="text-sm text-ink-secondary">
        Your original{" "}
        {versionHeadline({
          version_number: preview.input_version_number,
          kind: "ORIGINAL",
        })}{" "}
        will stay unchanged.
      </p>
      {preview.removed_row_count > 0 ? (
        <Callout tone="warning" title="Rows will be removed">
          This cleanup will remove {formatCount(preview.removed_row_count)} of{" "}
          {formatCount(preview.rows_before)} rows. Your original remains unchanged.
        </Callout>
      ) : null}
      {needsAck ? (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={acknowledged}
            onChange={(event) => {
              onAcknowledge(event.target.checked);
            }}
          />
          I understand this will remove a large share of rows from the new version.
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onConfirm} disabled={confirming || (needsAck && !acknowledged)}>
          {confirming ? "Creating cleaned version…" : "Create cleaned version"}
        </Button>
        <Button variant="secondary" onClick={onBack} disabled={confirming}>
          Back to preview
        </Button>
      </div>
    </section>
  );
}
