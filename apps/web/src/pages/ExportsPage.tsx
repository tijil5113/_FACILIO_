import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";

export function ExportsPage() {
  return (
    <EmptyState
      upcoming
      title="Exports"
      summary="Downloading cleaned files is not available in this version of FACILIO."
      detail="This is not a working export product. Use History to keep working with versions inside FACILIO."
      actions={
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/overview">Go Home</ButtonLink>
          <ButtonLink to="/datasets" variant="secondary">
            Datasets
          </ButtonLink>
        </div>
      }
    />
  );
}
