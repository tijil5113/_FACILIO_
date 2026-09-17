import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { analyzeFailureExperience } from "@/features/recovery/map-error";
import { QualityPanel } from "@/features/profile/QualityHero";
import type { WorkspaceAnalysis } from "@/features/datasets/workspace-state";
import { problemCountLabel } from "@/features/datasets/workspace-state";
import { formatCount, formatDateTime } from "@/lib/format";
import { versionHeadline } from "@/lib/version-labels";
import type { DatasetProfile } from "@/types/profile";
import type { DatasetVersion } from "@/types/transformations";

interface DatasetOverviewProps {
  profile: DatasetProfile | null;
  profileLoading: boolean;
  analysis: WorkspaceAnalysis;
  selectedVersion: DatasetVersion | undefined;
  viewingDifferent: boolean;
  usingVersion: DatasetVersion | undefined;
  onAnalyze: () => void;
  onReviewProblems: () => void;
  onViewData: () => void;
  onUseVersion: () => void;
}

export function DatasetOverview({
  profile,
  profileLoading,
  analysis,
  selectedVersion,
  viewingDifferent,
  usingVersion,
  onAnalyze,
  onReviewProblems,
  onViewData,
  onUseVersion,
}: DatasetOverviewProps) {
  if (profileLoading) {
    return (
      <div aria-busy="true" aria-label="Loading overview">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
    );
  }

  if (analysis === "analyzing") {
    return (
      <section className="max-w-2xl space-y-2" aria-label="Overview">
        <h2 className="type-section text-ink">Analyzing</h2>
        <p className="type-body text-ink-secondary" role="status">
          Looking for measurable problems. Analysis does not change your data.
        </p>
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
        actions={
          <Button size="sm" onClick={onAnalyze}>
            Try analysis again
          </Button>
        }
      />
    );
  }

  if (analysis === "not_analyzed") {
    return (
      <section className="max-w-2xl space-y-4" aria-label="Overview">
        <h2 className="type-section text-ink">Not analyzed</h2>
        <p className="type-body text-ink-secondary">
          Analyze this dataset to understand its structure and find measurable quality
          problems. Analysis does not change your data.
        </p>
        <Button onClick={onAnalyze}>Analyze dataset</Button>
      </section>
    );
  }

  const summary = profile?.summary;
  const problemTotal = profile?.issue_counts.total ?? 0;

  return (
    <section className="space-y-6" aria-label="Overview">
      <div className="max-w-2xl space-y-3">
        <h2 className="type-section text-ink">Overview</h2>
        <p className="type-body text-ink-secondary">
          {summary
            ? `${formatCount(summary.row_count)} rows · ${formatCount(summary.column_count)} columns`
            : "This version has been analyzed."}
          {selectedVersion ? ` · ${versionHeadline(selectedVersion)}` : ""}
          {selectedVersion?.is_current ? " · Using" : ""}
        </p>
        {viewingDifferent && usingVersion ? (
          <p className="type-body-sm text-ink-muted">
            You are viewing a version that FACILIO is not currently using. Currently using{" "}
            {versionHeadline(usingVersion)}.
          </p>
        ) : null}
        <p className="type-body text-ink" role="status">
          {problemTotal > 0
            ? `We found ${problemCountLabel(problemTotal)}.`
            : "No problems detected by the current checks."}
        </p>
        <div className="flex flex-wrap gap-2">
          {viewingDifferent ? (
            <Button onClick={onUseVersion}>Use this version</Button>
          ) : problemTotal > 0 ? (
            <Button onClick={onReviewProblems}>Review problems</Button>
          ) : (
            <Button onClick={onViewData}>View data</Button>
          )}
        </div>
      </div>
      {profile?.quality ? <QualityPanel quality={profile.quality} /> : null}
      {summary ? (
        <p className="type-caption text-ink-muted">
          Last analyzed {profile.profiled_at ? formatDateTime(profile.profiled_at) : "—"}
          {summary.duplicate_rows
            ? ` · ${formatCount(summary.duplicate_rows)} duplicate rows`
            : ""}
          {summary.missing_cells
            ? ` · ${formatCount(summary.missing_cells)} missing cells`
            : ""}
        </p>
      ) : null}
    </section>
  );
}
