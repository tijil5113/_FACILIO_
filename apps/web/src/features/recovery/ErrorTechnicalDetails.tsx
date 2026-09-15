import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { copyDiagnostics } from "@/features/recovery/copy-diagnostics";
import type { RecoveryExperience } from "@/features/recovery/types";

interface ErrorTechnicalDetailsProps {
  experience: RecoveryExperience;
  extra?: Array<{ label: string; value: string }>;
}

export function ErrorTechnicalDetails({
  experience,
  extra = [],
}: ErrorTechnicalDetailsProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await copyDiagnostics(experience);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <TechnicalDetails>
      <dl className="space-y-2 font-mono text-xs text-ink-secondary">
        {experience.code ? (
          <div>
            <dt className="text-ink-muted">Error</dt>
            <dd>{experience.code}</dd>
          </div>
        ) : null}
        {experience.requestId ? (
          <div>
            <dt className="text-ink-muted">Request ID</dt>
            <dd>{experience.requestId}</dd>
          </div>
        ) : null}
        {experience.status != null && experience.status > 0 ? (
          <div>
            <dt className="text-ink-muted">HTTP</dt>
            <dd>{experience.status}</dd>
          </div>
        ) : null}
        {experience.message ? (
          <div>
            <dt className="text-ink-muted">Message</dt>
            <dd className="whitespace-pre-wrap font-sans text-sm">
              {experience.message}
            </dd>
          </div>
        ) : null}
        {extra.map((item) => (
          <div key={item.label}>
            <dt className="text-ink-muted">{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={() => void copy()}>
          Copy technical details
        </Button>
        <span className="ml-2 text-xs text-ink-muted" role="status" aria-live="polite">
          {copied ? "Copied" : null}
        </span>
      </div>
    </TechnicalDetails>
  );
}
