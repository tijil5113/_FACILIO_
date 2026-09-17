import { Button } from "@/components/ui/Button";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { problemCountLabel } from "@/features/datasets/workspace-state";
import type { WorkspaceAnalysis } from "@/features/datasets/workspace-state";
import type { ReactNode } from "react";

interface CleanEntryProps {
  analysis: WorkspaceAnalysis;
  problemCount: number;
  onReviewSuggestions: () => void;
  children: ReactNode;
}

export function CleanEntry({
  analysis,
  problemCount,
  onReviewSuggestions,
  children,
}: CleanEntryProps) {
  const analyzed =
    analysis === "analyzed_with_problems" || analysis === "analyzed_no_problems";

  return (
    <section aria-label="Clean data" className="space-y-5">
      <div className="max-w-2xl space-y-2">
        <h2 className="type-section text-ink">Clean</h2>
        <p className="type-body text-ink-secondary">
          Cleaning creates a new version. Your original stays unchanged.
        </p>
        {analysis === "not_analyzed" ? (
          <p className="type-body-sm text-ink-muted">
            Analyze the dataset first if you want FACILIO to suggest cleanup from detected
            problems. Manual cleaning is still available.
          </p>
        ) : null}
        {analyzed && problemCount > 0 ? (
          <p className="type-body-sm text-ink-secondary">
            FACILIO found {problemCountLabel(problemCount)} and can suggest safe cleanup
            steps.
          </p>
        ) : null}
        {analyzed && problemCount === 0 ? (
          <p className="type-body-sm text-ink-muted">
            No suggested cleanup from current checks. You can still apply a manual step.
          </p>
        ) : null}
        <p>
          <LearnMoreLink to="/learn#cleaning">Why preview changes?</LearnMoreLink>
        </p>
        {analyzed && problemCount > 0 ? (
          <Button variant="secondary" onClick={onReviewSuggestions}>
            Review suggestions
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
