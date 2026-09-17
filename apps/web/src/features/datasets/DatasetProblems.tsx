import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { IssuesPanel } from "@/features/profile/IssuesPanel";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { analyzeFailureExperience } from "@/features/recovery/map-error";
import type { WorkspaceAnalysis } from "@/features/datasets/workspace-state";
import { problemCountLabel } from "@/features/datasets/workspace-state";
import type { DatasetProfile } from "@/types/profile";

interface DatasetProblemsProps {
  profile: DatasetProfile | null;
  profileLoading: boolean;
  analysis: WorkspaceAnalysis;
  datasetId: string;
  versionId?: string;
  onAnalyze: () => void;
  onGuidedCleanup: (focusId?: string) => void;
  onManualClean: () => void;
  onPrepareFix: (operation: string, parameters: Record<string, unknown>) => void;
}

export function DatasetProblems({
  profile,
  profileLoading,
  analysis,
  datasetId,
  versionId,
  onAnalyze,
  onGuidedCleanup,
  onManualClean,
  onPrepareFix,
}: DatasetProblemsProps) {
  if (profileLoading || analysis === "analyzing") {
    return (
      <section className="max-w-2xl space-y-2" aria-label="Problems">
        <h2 className="type-section text-ink">Analyzing</h2>
        <p className="type-body text-ink-secondary">
          FACILIO is inspecting this version. Nothing is being changed.
        </p>
      </section>
    );
  }

  if (analysis === "not_analyzed") {
    return (
      <section className="max-w-2xl space-y-4" aria-label="Problems">
        <h2 className="type-section text-ink">Analysis required</h2>
        <p className="type-body text-ink-secondary">
          Problems appear after FACILIO analyzes this version. This is not the same as
          finding zero problems.
        </p>
        <Button onClick={onAnalyze}>Analyze dataset</Button>
      </section>
    );
  }

  if (analysis === "failed") {
    return (
      <RecoveryMessage
        experience={analyzeFailureExperience()}
        extraDetails={
          profile?.error_message
            ? [{ label: "Message", value: profile.error_message }]
            : undefined
        }
        actions={<Button onClick={onAnalyze}>Try analysis again</Button>}
      />
    );
  }

  const problemCount = profile?.issue_counts.total ?? 0;
  const rowCount = profile?.summary?.row_count ?? null;

  return (
    <section aria-label="Problems" className="space-y-5">
      <div className="max-w-2xl space-y-2">
        <h2 className="type-section text-ink">Problems</h2>
        <p className="type-body text-ink" role="status">
          {problemCount > 0
            ? `We found ${problemCountLabel(problemCount)}.`
            : "No problems detected by the current checks."}
        </p>
        <p className="type-body-sm text-ink-secondary">
          {problemCount > 0
            ? "FACILIO detected these from measurable patterns in this version."
            : "FACILIO only evaluates supported checks. This is not a claim that the data is perfect or correct for its real-world purpose."}
        </p>
        <p>
          <LearnMoreLink to="/learn#problems">How FACILIO finds problems</LearnMoreLink>
        </p>
      </div>
      {problemCount === 0 ? (
        <Callout tone="neutral" title="No cleanup problems detected">
          You can still view the data or use manual Clean. FACILIO will not invent
          recommendations.
        </Callout>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                onGuidedCleanup();
              }}
            >
              Clean these problems
            </Button>
            <Button variant="secondary" onClick={onManualClean}>
              Open manual Clean
            </Button>
          </div>
          <IssuesPanel
            datasetId={datasetId}
            enabled
            versionId={versionId}
            rowCount={rowCount}
            onIncludeInCleanup={(issueId) => {
              onGuidedCleanup(issueId);
            }}
            onPrepareFix={onPrepareFix}
          />
        </>
      )}
    </section>
  );
}
