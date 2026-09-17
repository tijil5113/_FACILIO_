import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { CleanEntry } from "@/features/datasets/CleanEntry";
import { DatasetHeader } from "@/features/datasets/DatasetHeader";
import { DatasetOverview } from "@/features/datasets/DatasetOverview";
import { DatasetProblems } from "@/features/datasets/DatasetProblems";
import { DeleteDialog } from "@/features/datasets/DeleteDialog";
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
  useSetCurrentVersionMutation,
} from "@/features/datasets/queries";
import {
  resolveAnalysisState,
  resolveWorkspacePrimary,
  viewingDiffersFromUsing,
  analysisStateLabel,
} from "@/features/datasets/workspace-state";
import { GuidedCleanup } from "@/features/cleanup/GuidedCleanup";
import { HistoryPanel } from "@/features/transform/HistoryPanel";
import { TransformWorkspace } from "@/features/transform/TransformWorkspace";
import { ColumnExplorer } from "@/features/profile/ColumnExplorer";
import { FirstUseCue } from "@/features/onboarding/FirstUseCue";
import { ResourceNotFound } from "@/features/recovery/ResourceNotFound";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import {
  analyzeFailureExperience,
  mapRecoveryError,
} from "@/features/recovery/map-error";
import { columnTypeLabel } from "@/features/datasets/dtype-labels";
import { fileFormatLabel } from "@/features/datasets/file-format";
import { cn } from "@/lib/cn";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { useContextTitle } from "@/hooks/use-context-title";
import { useUiStore } from "@/stores/ui-store";

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
  const restoreVersion = useSetCurrentVersionMutation(datasetId ?? "");
  useContextTitle(datasetQuery.data?.name ?? null);

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
      <div className="page-enter content-workspace mx-auto space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <TableSkeleton rows={6} />
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
  const analysis = resolveAnalysisState({
    profile,
    analyzing,
    mutationFailed: profileMutation.isError,
  });
  const versions = Array.isArray(versionsQuery.data) ? versionsQuery.data : [];
  const selectedVersion = versions.find((item) => item.id === selectedVersionId);
  const usingVersion = versions.find((item) => item.is_current);
  const viewingDifferent = viewingDiffersFromUsing(
    selectedVersionId,
    dataset.current_version_id,
  );
  const primary = resolveWorkspacePrimary({
    analysis,
    viewingDifferent,
    datasetReady: dataset.status === "ready",
  });
  const problemCount = profile?.issue_counts.total ?? 0;

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

  function setVersion(versionId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("version", versionId);
    setSearchParams(next);
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

  function applyThisVersion() {
    if (!selectedVersionId) {
      return;
    }
    restoreVersion.mutate(selectedVersionId, {
      onSuccess: () => {
        showNotice("Using this version. Later versions are kept.");
      },
    });
  }

  function handlePrimary() {
    if (primary.kind === "analyze" || primary.kind === "retry-analyze") {
      runAnalyze();
      return;
    }
    if (primary.kind === "review-problems") {
      goToTab("problems");
      return;
    }
    if (primary.kind === "view-data") {
      goToTab("data");
      return;
    }
    if (primary.kind === "use-version") {
      applyThisVersion();
    }
  }

  const visibleTab: Exclude<WorkspaceTab, "cleanup"> = tab === "cleanup" ? "clean" : tab;

  return (
    <div
      className={cn(
        "page-enter mx-auto w-full space-y-6",
        tab === "data" ? "content-fluid" : "content-workspace",
      )}
    >
      <DatasetHeader
        dataset={dataset}
        versions={versionsQuery.data}
        selectedVersion={selectedVersion}
        selectedVersionId={selectedVersionId}
        viewingDifferent={viewingDifferent}
        usingVersion={usingVersion}
        analysisLabel={analysisStateLabel(profile?.status ?? dataset.profile_status)}
        primary={primary}
        analyzing={analyzing}
        onVersionChange={setVersion}
        onPrimary={handlePrimary}
        onRename={() => {
          setRenameOpen(true);
        }}
        onDelete={() => {
          setDeleteOpen(true);
        }}
      />

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

      {fromNewUpload &&
      !dataset.is_sample &&
      (analyzing || analysis === "not_analyzed") ? (
        <Callout tone="success" title="Dataset created">
          <p>Your original file is preserved.</p>
          <p className="mt-1" role="status">
            {analyzing
              ? "FACILIO is analyzing the data."
              : analysis === "failed"
                ? "Your uploaded data is still available and unchanged."
                : "FACILIO stored this file without changing values."}
          </p>
          <TechnicalDetails>
            <p>V1 — Original</p>
          </TechnicalDetails>
        </Callout>
      ) : null}

      {analysisOutcome === "problems" && analysis === "analyzed_with_problems" ? (
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
            FACILIO checked this version and found {problemCount}{" "}
            {problemCount === 1 ? "thing" : "things"} worth reviewing.
          </p>
          <p className="mt-1">Nothing has been changed yet.</p>
        </Callout>
      ) : null}

      {analysisOutcome === "none" && analysis === "analyzed_no_problems" ? (
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

      <div className="overflow-x-auto">
        <SegmentedControl<Exclude<WorkspaceTab, "cleanup">>
          legend="Dataset sections"
          value={visibleTab}
          onChange={goToTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "data", label: "Data" },
            {
              value: "problems",
              label: "Problems",
              hint:
                analysis === "analyzed_with_problems" && problemCount > 0
                  ? String(problemCount)
                  : undefined,
            },
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

      <div className="tab-enter">
        {tab === "overview" ? (
          <DatasetOverview
            profile={profile}
            profileLoading={profileQuery.isLoading}
            analysis={analysis}
            selectedVersion={selectedVersion}
            viewingDifferent={viewingDifferent}
            usingVersion={usingVersion}
            onAnalyze={runAnalyze}
            onReviewProblems={() => {
              goToTab("problems");
            }}
            onViewData={() => {
              goToTab("data");
            }}
            onUseVersion={applyThisVersion}
          />
        ) : null}

        {tab === "data" ? (
          <section aria-label="Data" className="space-y-6">
            {previewQuery.isLoading ? (
              <div aria-busy="true" aria-label="Loading preview">
                <TableSkeleton rows={8} />
              </div>
            ) : null}
            {previewQuery.isError ? (
              <RecoveryMessage
                experience={{
                  ...mapRecoveryError(previewQuery.error, {
                    operation: "load",
                    action: "Load data preview",
                    resourceId: datasetId,
                  }),
                  title: "This preview couldn't be loaded.",
                  explanation:
                    "FACILIO couldn't read the stored file for this version. The dataset record is still here.",
                  consequence: "Nothing on this page was changed.",
                }}
                extraDetails={
                  previewQuery.error instanceof Error
                    ? [{ label: "Message", value: previewQuery.error.message }]
                    : undefined
                }
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void previewQuery.refetch();
                    }}
                  >
                    Try again
                  </Button>
                }
              />
            ) : null}
            {previewQuery.data ? (
              <PreviewGrid
                preview={previewQuery.data}
                totalRows={profile?.summary?.row_count}
                totalColumns={profile?.summary?.column_count}
                detectedTypes={
                  profile?.status === "READY"
                    ? Object.fromEntries(
                        profile.columns.map((column) => [
                          column.name,
                          column.detected_type,
                        ]),
                      )
                    : undefined
                }
              />
            ) : null}
            {profile?.status === "READY" && profile.columns.length > 0 ? (
              <details className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3">
                <summary className="type-card-title cursor-pointer text-ink">
                  Column details
                </summary>
                <div className="mt-4">
                  <ColumnExplorer columns={profile.columns} />
                </div>
              </details>
            ) : (
              <IngestionColumns datasetColumns={dataset.columns} />
            )}
          </section>
        ) : null}

        {tab === "problems" ? (
          <DatasetProblems
            profile={profile}
            profileLoading={profileQuery.isLoading}
            analysis={analysis}
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
          <CleanEntry
            analysis={analysis}
            problemCount={problemCount}
            onReviewSuggestions={() => {
              goToTab("cleanup");
            }}
          >
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
          </CleanEntry>
        ) : null}

        {tab === "history" && selectedVersionId ? (
          <div className="space-y-4">
            <HistoryPanel
              datasetId={datasetId}
              versionId={selectedVersionId}
              onSelectVersion={setVersion}
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
          <div className="mt-6">
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
      </div>

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

function IngestionColumns({
  datasetColumns,
}: {
  datasetColumns: { name: string; index: number; dtype: string }[];
}) {
  return (
    <details className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3">
      <summary className="type-card-title cursor-pointer text-ink">
        Detected columns
      </summary>
      <div className="mt-4 overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
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
                <td className="px-4 py-2 text-ink-secondary">
                  {columnTypeLabel(column.dtype.toUpperCase())}
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
    </details>
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
        <Info label="Format" value={fileFormatLabel(fileType)} />
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
