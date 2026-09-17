import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { resourceNotFoundExperience } from "@/features/recovery/map-error";
import { ButtonLink } from "@/components/ui/ButtonLink";

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
      <h1 className="type-page-title text-ink">{experience.title}</h1>
      <RecoveryMessage
        experience={experience}
        actions={
          <ButtonLink to={destination.to} size="sm">
            {destination.label}
          </ButtonLink>
        }
      />
    </section>
  );
}
