import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { DeleteDialog } from "@/features/datasets/DeleteDialog";
import { ResourceNotFound } from "@/features/recovery/ResourceNotFound";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import {
  analyzeFailureExperience,
  mapRecoveryError,
} from "@/features/recovery/map-error";
import { DisabledHint } from "@/components/ui/DisabledHint";
import { PreviewGrid } from "@/features/datasets/PreviewGrid";
import { RenameDialog } from "@/features/datasets/RenameDialog";
import {
  useDatasetPreviewQuery,
  useDatasetQuery,
  useDatasetVersionsQuery,
  useDeleteDatasetMutation,
  useDatasetProfileQuery,
  useProfileDatasetMutation,
  useRenameDatasetMutation,
} from "@/features/datasets/queries";
import { GuidedCleanup } from "@/features/cleanup/GuidedCleanup";
import { HistoryPanel } from "@/features/transform/HistoryPanel";
import { TransformWorkspace } from "@/features/transform/TransformWorkspace";
import { ColumnExplorer } from "@/features/profile/ColumnExplorer";
import { DimensionCards } from "@/features/profile/DimensionCards";
import { IssuesPanel } from "@/features/profile/IssuesPanel";
import { MissingnessChart } from "@/features/profile/MissingnessChart";
import { QualityHero } from "@/features/profile/QualityHero";
import { FirstUseCue } from "@/features/onboarding/FirstUseCue";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { cn } from "@/lib/cn";
import { formatCount, formatDateTime, formatFileSize, formatPercent } from "@/lib/format";
import { datasetStatusLabel, profileStatusLabel } from "@/lib/status-labels";
import { versionSelectLabel } from "@/lib/version-labels";
import { useUiStore } from "@/stores/ui-store";
import type { DatasetProfile } from "@/types/profile";

type WorkspaceTab = "overview" | "data" | "problems" | "clean" | "history" | "cleanup";

function tabFromSearch(params: URLSearchParams): WorkspaceTab {
  const tab = params.get("tab");
  if (
    tab === "data" ||
    tab === "problems" ||
    tab === "clean" ||
    tab === "history" ||
    tab === "overview" ||
    tab === "cleanup"
  ) {
    return tab;
  }
  if (params.get("transform")) {
    return "clean";
  }
  return "overview";
}

export function DatasetWorkspacePage() {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setContextTitle = useUiStore((state) => state.setContextTitle);
  const showNotice = useUiStore((state) => state.showNotice);
  const announce = useUiStore((state) => state.announce);
  const [tab, setTab] = useState<WorkspaceTab>(() => tabFromSearch(searchParams));
  const autoAnalyzeStarted = useRef(false);
  const [fromNewUpload] = useState(searchParams.get("analyze") === "1");
  const [analysisOutcome, setAnalysisOutcome] = useState<"problems" | "none" | null>(
    null,
  );
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fixPrefill, setFixPrefill] = useState<{
    operation: string;
    parameters: Record<string, unknown>;
  } | null>(
    searchParams.get("transform")
      ? { operation: searchParams.get("transform") ?? "", parameters: {} }
      : null,
  );
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const datasetQuery = useDatasetQuery(datasetId);
  const versionsQuery = useDatasetVersionsQuery(datasetId);
  const selectedVersionId =
    searchParams.get("version") || datasetQuery.data?.current_version_id || undefined;
  const previewQuery = useDatasetPreviewQuery(
    datasetId,
    selectedVersionId,
    tab === "data" && datasetQuery.data?.status === "ready",
  );
  const profileQuery = useDatasetProfileQuery(datasetId, selectedVersionId);
  const profileMutation = useProfileDatasetMutation(datasetId ?? "", selectedVersionId);
  const renameMutation = useRenameDatasetMutation(datasetId ?? "");
  const deleteMutation = useDeleteDatasetMutation();

  useEffect(() => {
    if (datasetQuery.data?.name) {
      setContextTitle(datasetQuery.data.name);
    }
    return () => {
      setContextTitle(null);
    };
  }, [datasetQuery.data?.name, setContextTitle]);

  useEffect(() => {
    setTab(tabFromSearch(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("analyze") !== "1") {
      return;
    }
    const dataset = datasetQuery.data;
    if (!dataset || dataset.status !== "ready" || !datasetId) {
      return;
    }
    if (profileQuery.isPending) {
      return;
    }
    const status = profileQuery.data?.status;
    if (status === "READY" || status === "PROFILING") {
      const next = new URLSearchParams(searchParams);
      next.delete("analyze");
      if (status === "READY" && dataset.is_sample) {
        next.set("tab", "problems");
        setTab("problems");
      }
      setSearchParams(next, { replace: true });
      return;
    }
    if (autoAnalyzeStarted.current || profileMutation.isPending) {
      return;
    }
    autoAnalyzeStarted.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("analyze");
    setSearchParams(next, { replace: true });
    profileMutation.mutate(undefined, {
      onSuccess: (profile) => {
        const total = profile.issue_counts.total;
        setAnalysisOutcome(total > 0 ? "problems" : "none");
        announce(total > 0 ? "Analysis complete. Problems found." : "Analysis complete.");
        if (dataset.is_sample) {
          setTab("problems");
          const params = new URLSearchParams(next);
          params.set("tab", "problems");
          setSearchParams(params, { replace: true });
        }
      },
      onError: () => {
        autoAnalyzeStarted.current = false;
      },
    });
  }, [
    datasetId,
    datasetQuery.data,
    profileMutation,
    profileQuery.data?.status,
    profileQuery.isPending,
    searchParams,
    setSearchParams,
    announce,
  ]);

  if (datasetQuery.isLoading) {
    return (
      <div className="page-enter mx-auto max-w-5xl space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (datasetQuery.isError) {
    return <ResourceNotFound resource="dataset" error={datasetQuery.error} />;
  }

  const dataset = datasetQuery.data;
  if (!dataset || !datasetId) {
    return null;
  }

  const profile = profileQuery.data ?? null;
  const analyzing = profileMutation.isPending || profile?.status === "PROFILING";
  const analyzed = profile?.status === "READY";
  const analysisFailed = profile?.status === "FAILED" || profileMutation.isError;
  const hasProblems = analyzed && profile.issue_counts.total > 0;
  const selectedVersion = versionsQuery.data?.find(
    (item) => item.id === selectedVersionId,
  );

  function goToTab(next: WorkspaceTab) {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    setSearchParams(params, { replace: true });
  }

  function runAnalyze() {
    profileMutation.reset();
    profileMutation.mutate(undefined, {
      onSuccess: (nextProfile) => {
        setAnalysisOutcome(nextProfile.issue_counts.total > 0 ? "problems" : "none");
        announce(
          nextProfile.issue_counts.total > 0
            ? "Analysis complete. Problems found."
            : "Analysis complete.",
        );
      },
    });
  }

  const primaryActions = (
    <div className="flex flex-wrap gap-2">
      {!analyzed || analysisFailed ? (
        <DisabledHint
          disabled={analyzing || dataset.status !== "ready"}
          reason={
            analyzing
              ? "Analysis is already running."
              : dataset.status !== "ready"
                ? "This dataset is not ready to analyze yet."
                : undefined
          }
        >
          <Button onClick={runAnalyze} disabled={analyzing || dataset.status !== "ready"}>
            {analysisFailed
              ? "Retry analysis"
              : analyzing
                ? "Analyzing…"
                : "Analyze data"}
          </Button>
        </DisabledHint>
      ) : null}
      {analyzed && hasProblems ? (
        <Button
          onClick={() => {
            goToTab("cleanup");
          }}
        >
          Clean these problems
        </Button>
      ) : null}
      {analyzed ? (
        <Button
          variant={hasProblems ? "secondary" : "primary"}
          onClick={() => {
            goToTab("clean");
          }}
          disabled={dataset.status !== "ready" || !selectedVersionId}
        >
          Clean data
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            goToTab("clean");
          }}
          disabled={dataset.status !== "ready" || !selectedVersionId}
        >
          Clean data
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          setRenameOpen(true);
        }}
      >
        Rename
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          setDeleteOpen(true);
        }}
      >
        Delete
      </Button>
    </div>
  );

  return (
    <div
      className={cn(
        "page-enter mx-auto w-full space-y-6",
        tab === "data" ? "content-workspace" : "max-w-5xl",
      )}
    >
      <PageHeader
        eyebrow="Dataset"
        title={dataset.name}
        description="Understand this data, find problems, and clean it without changing the original."
        actions={primaryActions}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{dataset.file_type.toUpperCase()}</Badge>
        {dataset.is_sample ? (
          <Badge tone="info" aria-label="Sample dataset">
            Sample
          </Badge>
        ) : null}
        <Badge
          tone={
            dataset.status === "ready"
              ? "success"
              : dataset.status === "failed"
                ? "danger"
                : "warning"
          }
        >
          {datasetStatusLabel(dataset.status)}
        </Badge>
        <span className="text-sm text-ink-secondary">
          {formatCount(dataset.row_count)} rows · {formatCount(dataset.column_count)}{" "}
          columns
        </span>
        {dataset.version_count > 1 ? (
          <span className="text-sm text-ink-secondary">
            · {formatCount(dataset.version_count)} versions
          </span>
        ) : null}
      </div>

      {versionsQuery.data && selectedVersionId ? (
        <label className="block max-w-lg text-xs font-medium text-ink-secondary">
          Version
          <select
            className="mt-1 h-9 w-full rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-sm text-ink"
            value={selectedVersionId}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              next.set("version", event.target.value);
              setSearchParams(next);
            }}
          >
            {versionsQuery.data.map((version) => (
              <option key={version.id} value={version.id}>
                {versionSelectLabel(version, {
                  viewing: version.id === selectedVersionId,
                })}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="text-sm text-ink-secondary">Your original is preserved.</p>

      {dataset.is_sample ? (
        <Callout
          tone="neutral"
          title="Sample data"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigate("/datasets?upload=1");
              }}
            >
              Use my own data
            </Button>
          }
        >
          You’re exploring a fictional customer dataset designed to demonstrate FACILIO.
          Everything you see is produced by the real data engine.
        </Callout>
      ) : null}

      {fromNewUpload && !dataset.is_sample && (analyzing || !analyzed) ? (
        <Callout tone="success" title="Dataset created">
          <p>Your original file is preserved.</p>
          <p className="mt-1" role="status">
            {analyzing
              ? "FACILIO is analyzing the data."
              : analysisFailed
                ? "Your uploaded data is still available and unchanged."
                : "FACILIO stored this file without changing values."}
          </p>
          <TechnicalDetails>
            <p>V1 — Original</p>
          </TechnicalDetails>
        </Callout>
      ) : null}

      {analysisOutcome === "problems" && analyzed ? (
        <Callout
          tone="success"
          title="Analysis complete"
          action={
            <Button
              size="sm"
              onClick={() => {
                goToTab("cleanup");
              }}
            >
              Clean these problems
            </Button>
          }
        >
          <p role="status">
            FACILIO checked this version and found{" "}
            {formatCount(profile.issue_counts.total)}{" "}
            {profile.issue_counts.total === 1 ? "thing" : "things"} worth reviewing.
          </p>
          <p className="mt-1">Nothing has been changed yet.</p>
        </Callout>
      ) : null}

      {analysisOutcome === "none" && analyzed ? (
        <Callout
          tone="success"
          title="Analysis complete"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                goToTab("data");
              }}
            >
              View data
            </Button>
          }
        >
          <p role="status">FACILIO didn’t detect problems with the checks it ran.</p>
        </Callout>
      ) : null}

      {appliedNotice ? (
        <Callout tone="success" title="New version created">
          <p>{appliedNotice}</p>
          <p className="mt-1">
            The original file and earlier versions were not overwritten.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                goToTab("history");
              }}
            >
              Open history
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                goToTab("data");
              }}
            >
              View data
            </Button>
          </div>
        </Callout>
      ) : null}

      {dataset.status === "failed" ? (
        <Callout tone="danger" title="Upload didn't finish">
          <p>{dataset.error_message ?? "This dataset is not available for preview."}</p>
          <p className="mt-1">No cleaned version was created from this file.</p>
        </Callout>
      ) : null}

      {analyzing ? (
        <Callout tone="info" title="Analyzing your data…">
          <span role="status" aria-live="polite">
            Looking for measurable problems. Analysis does not change your data.
          </span>
        </Callout>
      ) : null}

      {profileMutation.isError ? (
        <RecoveryMessage
          experience={analyzeFailureExperience(profileMutation.error)}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={runAnalyze}>
                Try analysis again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  goToTab("data");
                }}
              >
                View data
              </Button>
            </div>
          }
        />
      ) : null}

      {profile?.status === "FAILED" && !analyzing && !profileMutation.isError ? (
        <RecoveryMessage
          experience={analyzeFailureExperience()}
          extraDetails={
            profile.error_message
              ? [{ label: "Message", value: profile.error_message }]
              : undefined
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={runAnalyze}>
                Try analysis again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  goToTab("data");
                }}
              >
                View data
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="overflow-x-auto">
        <SegmentedControl<WorkspaceTab>
          legend="Dataset sections"
          value={tab === "cleanup" ? "problems" : tab}
          onChange={goToTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "data", label: "Data" },
            { value: "problems", label: "Problems" },
            { value: "clean", label: "Clean" },
            { value: "history", label: "History" },
          ]}
        />
      </div>

      {tab === "problems" ? (
        <FirstUseCue
          cue="problems"
          title={dataset.is_sample ? "Sample analysis" : "Problems"}
        >
          {dataset.is_sample
            ? "FACILIO analyzed the sample. These are the problems it actually detected. Nothing has been changed yet."
            : "Nothing changes until you preview and approve a cleanup."}
        </FirstUseCue>
      ) : null}

      {tab === "history" ? (
        <FirstUseCue cue="history" title="Original preserved">
          Your original remains available here.
        </FirstUseCue>
      ) : null}

      {tab === "overview" ? (
        <OverviewSection
          profile={profile}
          profileLoading={profileQuery.isLoading}
          analyzing={analyzing}
          onAnalyze={runAnalyze}
          onReviewProblems={() => {
            goToTab("problems");
          }}
          onGuidedCleanup={() => {
            goToTab("cleanup");
          }}
        />
      ) : null}

      {tab === "data" ? (
        <section aria-label="Data" className="space-y-6">
          {previewQuery.isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading preview">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : null}
          {previewQuery.isError ? (
            <RecoveryMessage
              experience={mapRecoveryError(previewQuery.error, {
                operation: "load",
                action: "Load data preview",
                resourceId: datasetId,
              })}
            />
          ) : null}
          {previewQuery.data ? <PreviewGrid preview={previewQuery.data} /> : null}
          {profile?.status === "READY" && profile.columns.length > 0 ? (
            <ColumnExplorer columns={profile.columns} />
          ) : (
            <IngestionColumns datasetColumns={dataset.columns} />
          )}
        </section>
      ) : null}

      {tab === "problems" ? (
        <ProblemsSection
          profile={profile}
          profileLoading={profileQuery.isLoading}
          analyzing={analyzing}
          datasetId={datasetId}
          versionId={selectedVersionId}
          onAnalyze={runAnalyze}
          onGuidedCleanup={(focusId) => {
            const next = new URLSearchParams(searchParams);
            next.set("tab", "cleanup");
            if (focusId) {
              next.set("focus", focusId);
            } else {
              next.delete("focus");
            }
            setSearchParams(next);
            setTab("cleanup");
          }}
          onManualClean={() => {
            goToTab("clean");
          }}
          onPrepareFix={(operation, parameters) => {
            const next = new URLSearchParams(searchParams);
            next.set("transform", operation);
            setSearchParams(next);
            setFixPrefill({ operation, parameters });
            goToTab("clean");
          }}
        />
      ) : null}

      {tab === "cleanup" && selectedVersionId ? (
        <GuidedCleanup
          datasetId={datasetId}
          versionId={selectedVersionId}
          versionNumber={
            selectedVersion?.version_number ?? dataset.current_version_number ?? 1
          }
          focusId={searchParams.get("focus")}
          onLeave={() => {
            goToTab("problems");
          }}
          onManualClean={() => {
            goToTab("clean");
          }}
          onOpenVersion={(versionId, nextTab) => {
            const next = new URLSearchParams(searchParams);
            next.set("version", versionId);
            next.set("tab", nextTab);
            next.delete("focus");
            setSearchParams(next);
            setTab(nextTab);
          }}
        />
      ) : null}

      {tab === "clean" && selectedVersionId ? (
        <section aria-label="Clean data" className="space-y-4">
          <p className="text-sm leading-6 text-ink-secondary">
            FACILIO will create a new version. Your original stays unchanged.{" "}
            <LearnMoreLink to="/learn#cleaning">Why preview changes?</LearnMoreLink>
          </p>
          <TransformWorkspace
            variant="inline"
            open
            datasetId={datasetId}
            versionId={selectedVersionId}
            versionNumber={
              selectedVersion?.version_number ?? dataset.current_version_number ?? 1
            }
            columns={dataset.columns}
            initialOperation={fixPrefill?.operation}
            initialParameters={fixPrefill?.parameters}
            onClose={() => {
              goToTab("overview");
            }}
            onApplied={(versionId, versionNumber, summary) => {
              const next = new URLSearchParams(searchParams);
              next.set("version", versionId);
              next.delete("transform");
              setSearchParams(next);
              setAppliedNotice(`V${String(versionNumber)} created. ${summary}`);
              goToTab("history");
            }}
          />
        </section>
      ) : null}

      {tab === "history" && selectedVersionId ? (
        <div className="space-y-4">
          <HistoryPanel
            datasetId={datasetId}
            versionId={selectedVersionId}
            onSelectVersion={(versionId) => {
              const next = new URLSearchParams(searchParams);
              next.set("version", versionId);
              setSearchParams(next);
            }}
          />
          <SourceTechnicalDetails
            filename={dataset.original_filename}
            fileType={dataset.file_type}
            fileSize={dataset.file_size}
            createdAt={dataset.created_at}
            selectedSheet={dataset.selected_sheet}
            delimiter={dataset.delimiter}
            encoding={dataset.encoding}
            datasetId={dataset.id}
            versionId={selectedVersionId}
          />
        </div>
      ) : null}

      {tab === "overview" ? (
        <SourceTechnicalDetails
          filename={dataset.original_filename}
          fileType={dataset.file_type}
          fileSize={dataset.file_size}
          createdAt={dataset.created_at}
          selectedSheet={dataset.selected_sheet}
          delimiter={dataset.delimiter}
          encoding={dataset.encoding}
          datasetId={dataset.id}
          versionId={selectedVersionId}
        />
      ) : null}

      <RenameDialog
        key={dataset.name}
        open={renameOpen}
        currentName={dataset.name}
        onClose={() => {
          setRenameOpen(false);
        }}
        onRename={async (name) => {
          await renameMutation.mutateAsync(name);
          showNotice("Dataset renamed.");
        }}
      />
      <DeleteDialog
        open={deleteOpen}
        datasetName={dataset.name}
        originalFilename={dataset.original_filename}
        onClose={() => {
          setDeleteOpen(false);
        }}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(dataset.id);
          showNotice("Dataset deleted.");
          void navigate("/datasets");
        }}
      />
    </div>
  );
}

function OverviewSection({
  profile,
  profileLoading,
  analyzing,
  onAnalyze,
  onReviewProblems,
  onGuidedCleanup,
}: {
  profile: DatasetProfile | null;
  profileLoading: boolean;
  analyzing: boolean;
  onAnalyze: () => void;
  onReviewProblems: () => void;
  onGuidedCleanup: () => void;
}) {
  if (profileLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (!profile || profile.status === "NOT_PROFILED" || profile.status === "PROFILING") {
    return <UnprofiledState analyzing={analyzing} onAnalyze={onAnalyze} />;
  }
  if (profile.status === "FAILED") {
    return (
      <RecoveryMessage
        experience={analyzeFailureExperience()}
        actions={
          <Button size="sm" onClick={onAnalyze}>
            Try analysis again
          </Button>
        }
      />
    );
  }
  const summary = profile.summary;
  if (!summary) {
    return <UnprofiledState analyzing={analyzing} onAnalyze={onAnalyze} />;
  }
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Metric label="Rows" value={formatCount(summary.row_count)} />
        <Metric label="Columns" value={formatCount(summary.column_count)} />
        <Metric label="Total cells" value={formatCount(summary.total_cells)} />
        <Metric label="Missing cells" value={formatCount(summary.missing_cells)} />
        <Metric label="Duplicate rows" value={formatCount(summary.duplicate_rows)} />
        <Metric
          label="Last analyzed"
          value={profile.profiled_at ? formatDateTime(profile.profiled_at) : "—"}
        />
      </dl>
      {profile.quality ? <QualityHero quality={profile.quality} /> : null}
      {profile.issue_counts.total > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={onGuidedCleanup}>Clean these problems</Button>
          <Button variant="secondary" onClick={onReviewProblems}>
            Review problems
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink-secondary">
          FACILIO didn’t detect cleanup problems with the checks it ran.
        </p>
      )}
      <p className="text-xs text-ink-muted">
        Completeness {formatPercent(summary.complete_percentage)} · Unique rows{" "}
        {formatCount(summary.unique_rows)}
      </p>
    </div>
  );
}

function ProblemsSection({
  profile,
  profileLoading,
  analyzing,
  datasetId,
  versionId,
  onAnalyze,
  onGuidedCleanup,
  onManualClean,
  onPrepareFix,
}: {
  profile: DatasetProfile | null;
  profileLoading: boolean;
  analyzing: boolean;
  datasetId: string;
  versionId?: string;
  onAnalyze: () => void;
  onGuidedCleanup: (focusId?: string) => void;
  onManualClean: () => void;
  onPrepareFix: (operation: string, parameters: Record<string, unknown>) => void;
}) {
  if (profileLoading || analyzing) {
    return (
      <Card>
        <h2 className="text-sm font-medium text-ink">Analyzing</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          FACILIO is inspecting this version. Nothing is being changed.
        </p>
      </Card>
    );
  }
  if (!profile || profile.status === "NOT_PROFILED") {
    return <UnprofiledState analyzing={analyzing} onAnalyze={onAnalyze} />;
  }
  if (profile.status === "FAILED") {
    return (
      <RecoveryMessage
        experience={analyzeFailureExperience()}
        extraDetails={
          profile.error_message
            ? [{ label: "Message", value: profile.error_message }]
            : undefined
        }
        actions={<Button onClick={onAnalyze}>Try analysis again</Button>}
      />
    );
  }
  if (profile.status !== "READY") {
    return <UnprofiledState analyzing={analyzing} onAnalyze={onAnalyze} />;
  }

  const problemCount = profile.issue_counts.total;
  return (
    <section aria-label="Problems" className="space-y-5">
      <p className="text-sm text-ink-secondary" role="status">
        {profileStatusLabel(profile.status)}
        {problemCount > 0
          ? ` · ${formatCount(problemCount)} problems found`
          : " · no detected problems"}
      </p>
      <p>
        <LearnMoreLink to="/learn#problems">How FACILIO finds problems</LearnMoreLink>
      </p>
      {profile.quality ? <QualityHero quality={profile.quality} /> : null}
      {profile.quality ? (
        <DimensionCards dimensions={profile.quality.dimensions} />
      ) : null}
      {profile.columns.length > 0 ? <MissingnessChart columns={profile.columns} /> : null}
      {problemCount === 0 ? (
        <Callout
          tone="success"
          title="FACILIO didn’t detect cleanup problems with the checks it ran"
        >
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

function UnprofiledState({
  analyzing,
  onAnalyze,
}: {
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  return (
    <Card>
      <h2 className="text-sm font-medium text-ink">Not analyzed</h2>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">
        Analysis looks for measurable problems such as missing values and duplicates. It
        does not change your original data.
      </p>
      <Button className="mt-4" onClick={onAnalyze} disabled={analyzing}>
        {analyzing ? "Analyzing…" : "Analyze data"}
      </Button>
    </Card>
  );
}

function IngestionColumns({
  datasetColumns,
}: {
  datasetColumns: { name: string; index: number; dtype: string }[];
}) {
  return (
    <>
      <div className="overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Detected columns</caption>
          <thead className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {datasetColumns.map((column) => (
              <tr key={column.index} className="border-t border-line">
                <td className="px-4 py-2 font-mono text-xs text-ink-muted">
                  {column.index + 1}
                </td>
                <td className="px-4 py-2 text-ink">{column.name || "(blank)"}</td>
                <td className="px-4 py-2 text-xs uppercase text-ink-secondary">
                  {column.dtype}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Types are conservative inferences for display. Analyze the dataset for column
        profiles.
      </p>
    </>
  );
}

function SourceTechnicalDetails({
  filename,
  fileType,
  fileSize,
  createdAt,
  selectedSheet,
  delimiter,
  encoding,
  datasetId,
  versionId,
}: {
  filename: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  selectedSheet: string | null;
  delimiter: string | null;
  encoding: string | null;
  datasetId: string;
  versionId?: string;
}) {
  return (
    <TechnicalDetails>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Info label="Original filename" value={filename} />
        <Info label="Format" value={fileType.toUpperCase()} />
        <Info label="File size" value={formatFileSize(fileSize)} />
        <Info label="Created" value={formatDateTime(createdAt)} />
        {selectedSheet ? <Info label="Selected sheet" value={selectedSheet} /> : null}
        {delimiter ? (
          <Info label="Delimiter" value={visibleDelimiter(delimiter)} />
        ) : null}
        {encoding ? <Info label="Encoding" value={encoding} /> : null}
        <Info label="Dataset ID" value={datasetId} />
        {versionId ? <Info label="Version ID" value={versionId} /> : null}
      </dl>
    </TechnicalDetails>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3">
      <dt className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function visibleDelimiter(delimiter: string): string {
  if (delimiter === "\t") {
    return "tab";
  }
  if (delimiter === ",") {
    return "comma";
  }
  if (delimiter === ";") {
    return "semicolon";
  }
  if (delimiter === "|") {
    return "pipe";
  }
  return delimiter;
}
