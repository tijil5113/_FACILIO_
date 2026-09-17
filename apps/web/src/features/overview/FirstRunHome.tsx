import type { ReactNode } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/Button";
import { ProductJourney } from "@/features/overview/ProductJourney";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { TrustMessage } from "@/features/overview/TrustMessage";
import { WelcomeHero } from "@/features/overview/WelcomeHero";

export function FirstRunHome({
  onUpload,
  onTryFacilio,
  sampleBusy,
  sampleError,
  limitedNotice,
}: {
  onUpload: () => void;
  onTryFacilio: () => void;
  sampleBusy: boolean;
  sampleError: unknown;
  limitedNotice?: ReactNode;
}) {
  const recovery = sampleError
    ? mapRecoveryError(sampleError, { operation: "sample", action: "Try FACILIO" })
    : null;

  return (
    <div className="space-y-10">
      <WelcomeHero
        onUpload={onUpload}
        onTryFacilio={onTryFacilio}
        sampleBusy={sampleBusy}
      />
      {limitedNotice}
      {recovery ? (
        <RecoveryMessage
          experience={recovery}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={onTryFacilio}>
                Try again
              </Button>
              <Button size="sm" onClick={onUpload}>
                Upload your data
              </Button>
            </div>
          }
        />
      ) : null}
      <ProductJourney />
      <TrustMessage />
      <p>
        <Link
          to="/learn"
          className="type-body text-ink-secondary underline decoration-line underline-offset-4 hover:text-ink"
        >
          New to FACILIO? Learn how it works
        </Link>
      </p>
    </div>
  );
}
