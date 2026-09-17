import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SAMPLE_UPLOAD_LABEL } from "@/features/overview/home-content";
import {
  continueWorkingSummary,
  sampleDestination,
} from "@/features/overview/home-state";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { versionHeadline } from "@/lib/version-labels";
import type { DatasetSummary } from "@/types/dataset";

export function SampleHome({
  sample,
  onUpload,
  sampleError,
  limitedNotice,
}: {
  sample: DatasetSummary | undefined;
  onUpload: () => void;
  sampleError: unknown;
  limitedNotice?: ReactNode;
}) {
  const recovery = sampleError
    ? mapRecoveryError(sampleError, { operation: "sample", action: "Try FACILIO" })
    : null;
  const href = sample ? sampleDestination(sample) : "/datasets";

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <p className="type-meta text-ink-muted uppercase">Sample data</p>
        <h1 className="type-display mt-2 text-ink">Continue exploring the sample</h1>
        <p className="type-body mt-4 text-ink-secondary">
          You’re exploring FACILIO with sample data. It is fictional example data, not a
          file you uploaded.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ButtonLink to={href}>
            {sample ? "Continue exploring sample" : "Open datasets"}
          </ButtonLink>
          <Button variant="secondary" onClick={onUpload}>
            {SAMPLE_UPLOAD_LABEL}
          </Button>
        </div>
      </section>
      {limitedNotice}
      {recovery ? <RecoveryMessage experience={recovery} /> : null}
      {sample ? (
        <article className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Sample</Badge>
            <span className="type-caption">Example data</span>
          </div>
          <h2
            className="type-card-title mt-3 min-w-0 truncate text-ink"
            title={sample.name}
          >
            {sample.name}
          </h2>
          <p className="type-body-sm mt-2 text-ink-secondary">
            {sample.current_version_number
              ? versionHeadline({
                  version_number: sample.current_version_number,
                  kind: sample.current_version_number === 1 ? "ORIGINAL" : "DERIVED",
                })
              : "Version unavailable"}
            {" · "}
            {continueWorkingSummary(sample)}
          </p>
        </article>
      ) : null}
    </div>
  );
}
