import { Link } from "react-router";

import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { resourceNotFoundExperience } from "@/features/recovery/map-error";

interface ResourceNotFoundProps {
  resource: "dataset" | "cleanup" | "activity";
  error?: unknown;
}

const DESTINATIONS = {
  dataset: { to: "/datasets", label: "View datasets" },
  cleanup: { to: "/workflows", label: "View Cleanups" },
  activity: { to: "/jobs", label: "View Activity" },
} as const;

export function ResourceNotFound({ resource, error }: ResourceNotFoundProps) {
  const experience = resourceNotFoundExperience(resource, error);
  const destination = DESTINATIONS[resource];
  return (
    <section className="page-enter mx-auto max-w-xl space-y-4">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">
        {experience.title}
      </h1>
      <RecoveryMessage
        experience={experience}
        actions={
          <Link
            to={destination.to}
            className="inline-flex h-8 items-center rounded-[var(--facilio-radius-md)] border border-ink bg-ink px-3 text-sm font-medium text-canvas hover:bg-ink/90 dark:text-[#121410]"
          >
            {destination.label}
          </Link>
        }
      />
    </section>
  );
}
