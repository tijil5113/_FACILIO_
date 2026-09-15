import type { ReactNode } from "react";

import { Callout } from "@/components/ui/Callout";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { ErrorTechnicalDetails } from "@/features/recovery/ErrorTechnicalDetails";
import type { RecoveryExperience } from "@/features/recovery/types";

interface RecoveryMessageProps {
  experience: RecoveryExperience;
  actions?: ReactNode;
  extraDetails?: Array<{ label: string; value: string }>;
  live?: boolean;
}

const tone = {
  info: "info",
  warning: "warning",
  error: "danger",
} as const;

export function RecoveryMessage({
  experience,
  actions,
  extraDetails,
  live = true,
}: RecoveryMessageProps) {
  return (
    <Callout tone={tone[experience.severity]} title={experience.title} action={actions}>
      <div className="space-y-2" role={live ? "alert" : undefined}>
        <p>{experience.explanation}</p>
        <p>{experience.consequence}</p>
        {experience.learnHref && experience.learnLabel ? (
          <p>
            <LearnMoreLink to={experience.learnHref}>
              {`Learn: ${experience.learnLabel}`}
            </LearnMoreLink>
          </p>
        ) : null}
        <ErrorTechnicalDetails experience={experience} extra={extraDetails} />
      </div>
    </Callout>
  );
}
