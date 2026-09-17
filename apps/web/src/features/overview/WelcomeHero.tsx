import { Button } from "@/components/ui/Button";
import {
  PRIMARY_UPLOAD_LABEL,
  TRY_FACILIO_LABEL,
  WELCOME_EYEBROW,
  WELCOME_HEADLINE,
  WELCOME_SUPPORT,
} from "@/features/overview/home-content";
import { TransformationStory } from "@/features/overview/TransformationStory";

export function WelcomeHero({
  onUpload,
  onTryFacilio,
  sampleBusy,
}: {
  onUpload: () => void;
  onTryFacilio: () => void;
  sampleBusy: boolean;
}) {
  return (
    <div className="home-welcome">
      <div className="min-w-0">
        <p className="type-meta text-ink-muted uppercase">{WELCOME_EYEBROW}</p>
        <h1 className="type-display mt-2 max-w-xl text-ink">{WELCOME_HEADLINE}</h1>
        <p className="type-body mt-4 max-w-xl text-ink-secondary">{WELCOME_SUPPORT}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button onClick={onUpload} disabled={sampleBusy}>
            {PRIMARY_UPLOAD_LABEL}
          </Button>
          <Button
            variant="secondary"
            onClick={onTryFacilio}
            loading={sampleBusy}
            disabled={sampleBusy}
          >
            {sampleBusy ? "Adding sample" : TRY_FACILIO_LABEL}
          </Button>
        </div>
        <SampleSetupStatus busy={sampleBusy} />
      </div>
      <TransformationStory />
    </div>
  );
}

export function SampleSetupStatus({ busy }: { busy: boolean }) {
  if (!busy) {
    return (
      <p className="type-body-sm mt-3 text-ink-muted">
        FACILIO stores your original file. Upload does not clean or rewrite values.
      </p>
    );
  }
  return (
    <p className="type-body-sm mt-3 text-ink-secondary" role="status" aria-live="polite">
      Adding sample. Analysis starts next — nothing is cleaned automatically.
    </p>
  );
}
