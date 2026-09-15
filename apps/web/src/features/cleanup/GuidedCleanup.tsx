import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DisabledHint } from "@/components/ui/DisabledHint";
import { Skeleton } from "@/components/ui/Skeleton";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { runDatasetProfile } from "@/services/profiles";
import { useCreateWorkflowMutation } from "@/features/workflows/queries";
import { versionHeadline } from "@/lib/version-labels";
import { useUiStore } from "@/stores/ui-store";
import type { CleanupApplyResult, CleanupPreview } from "@/types/cleanup";

import { CleanupApproval } from "./CleanupApproval";
import { CleanupPreviewView } from "./CleanupPreview";
import { CleanupResult } from "./CleanupResult";
import { RecommendationList } from "./RecommendationList";
import { SaveCleanupDialog } from "./SaveCleanupDialog";
import {
  asText,
  detectConflicts,
  humanStep,
  initialSelections,
  selectedSteps,
  stepNeedsValue,
  type PlanSelection,
} from "./plan-state";
import {
  useCleanupApplyMutation,
  useCleanupPreviewMutation,
  useCleanupRecommendationsQuery,
} from "./queries";

type Stage = "review" | "preview" | "approve" | "result";

interface GuidedCleanupProps {
  datasetId: string;
  versionId: string;
  versionNumber: number;
  focusId?: string | null;
  onLeave: () => void;
  onManualClean: () => void;
  onOpenVersion: (versionId: string, tab: "data" | "history" | "problems") => void;
}

export function GuidedCleanup({
  datasetId,
  versionId,
  versionNumber,
  focusId,
  onLeave,
  onManualClean,
  onOpenVersion,
}: GuidedCleanupProps) {
  const navigate = useNavigate();
  const recsQuery = useCleanupRecommendationsQuery(datasetId, versionId);
  const previewMutation = useCleanupPreviewMutation(datasetId, versionId);
  const applyMutation = useCleanupApplyMutation(datasetId, versionId);
  const saveMutation = useCreateWorkflowMutation();
  const announce = useUiStore((state) => state.announce);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const queryClient = useQueryClient();
  const retryProfile = useMutation({
    mutationFn: (outputId: string) => runDatasetProfile(datasetId, outputId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
  });
  const [stage, setStage] = useState<Stage>("review");
  const [selections, setSelections] = useState<Record<string, PlanSelection>>({});
  const [initialized, setInitialized] = useState(false);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [result, setResult] = useState<CleanupApplyResult | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [appliedSteps, setAppliedSteps] = useState(selectedSteps([], {}));

  useEffect(() => {
    if (!recsQuery.data || initialized) {
      return;
    }
    setSelections(initialSelections(recsQuery.data.recommendations, focusId));
    setInitialized(true);
  }, [focusId, initialized, recsQuery.data]);

  const recommendations = useMemo(
    () => recsQuery.data?.recommendations ?? [],
    [recsQuery.data],
  );
  const steps = useMemo(
    () => selectedSteps(recommendations, selections),
    [recommendations, selections],
  );
  const incomplete = steps.some(stepNeedsValue);
  const conflictById = useMemo(() => detectConflicts(steps), [steps]);
  const hasConflicts = Object.keys(conflictById).length > 0;
  const dirty = stage !== "result" && initialized && steps.length > 0;

  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) {
      return;
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty]);

  function updateSelection(id: string, patch: Partial<PlanSelection>) {
    setSelections((current) => ({
      ...current,
      [id]: { ...current[id], ...patch } as PlanSelection,
    }));
    setPreview(null);
    if (stage !== "review") {
      setStage("review");
    }
  }

  async function runPreview() {
    try {
      const next = await previewMutation.mutateAsync(steps);
      setPreview(next);
      setStage("preview");
    } catch {
      setPreview(null);
    }
  }

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    if (stage === "preview") {
      announce("Preview ready");
    }
    if (stage === "approve") {
      announce("Ready to create a cleaned version. Original will stay unchanged.");
    }
    if (stage === "result") {
      announce("Cleanup complete");
    }
  }, [announce, stage]);

  async function runApply() {
    if (!preview) {
      return;
    }
    try {
      const next = await applyMutation.mutateAsync({
        steps,
        plan_fingerprint: preview.plan_fingerprint,
        acknowledge_high_impact: preview.high_impact ? acknowledged : false,
      });
      setAppliedSteps(steps);
      setResult(next);
      setStage("result");
    } catch {
      announce("Cleanup failed");
    }
  }

  if (recsQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (recsQuery.isError) {
    return (
      <RecoveryMessage
        experience={mapRecoveryError(recsQuery.error, {
          operation: "cleanup",
          action: "Load guided cleanup",
          resourceId: datasetId,
        })}
        actions={
          <Button size="sm" variant="secondary" onClick={onLeave}>
            Back to Problems
          </Button>
        }
      />
    );
  }

  const actionable = recommendations.filter((item) => item.kind === "actionable");
  const previewError = previewMutation.error
    ? mapRecoveryError(previewMutation.error, {
        operation: "preview",
        action: "Preview cleanup",
        resourceId: datasetId,
      })
    : null;
  const applyError = applyMutation.error
    ? mapRecoveryError(applyMutation.error, {
        operation: "cleanup",
        action: "Apply cleanup",
        resourceId: datasetId,
      })
    : null;
  const previewDisabledReason =
    steps.length === 0
      ? "Choose at least one cleanup step to preview."
      : incomplete
        ? "Choose a fill value before preview."
        : hasConflicts
          ? "Resolve conflicting steps before preview."
          : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-ink-muted">Guided cleanup</p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-1 text-lg font-semibold tracking-tight text-ink outline-none"
        >
          {stage === "review"
            ? "Choose fixes"
            : stage === "preview"
              ? "Preview"
              : stage === "approve"
                ? "Ready to clean"
                : "Result"}
        </h2>
        <ol
          className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted"
          aria-label="Cleanup stages"
        >
          {(
            [
              ["review", "Choose fixes"],
              ["preview", "Preview"],
              ["approve", "Approve"],
              ["result", "Result"],
            ] as const
          ).map(([id, label], index, list) => (
            <li key={id} className="flex items-center gap-2">
              <span className={stage === id ? "font-medium text-ink" : undefined}>
                {label}
              </span>
              {index < list.length - 1 ? <span aria-hidden="true">→</span> : null}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          Cleaning {versionHeadline({ version_number: versionNumber })}. Nothing changes
          until you preview and approve. Your original stays unchanged.{" "}
          <LearnMoreLink to="/learn#cleaning">Why preview changes?</LearnMoreLink>
        </p>
      </div>

      {blocker.state === "blocked" ? (
        <Callout
          tone="warning"
          title="Leave this cleanup?"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  blocker.proceed();
                }}
              >
                Leave
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  blocker.reset();
                }}
              >
                Stay
              </Button>
            </div>
          }
        >
          Your selected fixes are not saved. A refresh also resets an unapplied plan.
        </Callout>
      ) : null}

      {stage === "review" ? (
        <>
          {actionable.length === 0 ? (
            <Callout
              tone="success"
              title="FACILIO didn’t detect cleanup problems with the checks it ran"
              action={
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={onLeave}>
                    Back to Problems
                  </Button>
                </div>
              }
            >
              You can still view the data or use manual Clean. FACILIO will not invent
              recommendations.
            </Callout>
          ) : (
            <RecommendationList
              recommendations={recommendations}
              selections={selections}
              conflictById={conflictById}
              selectedCount={steps.length}
              actionableCount={actionable.length}
              onToggle={(id, selected) => {
                updateSelection(id, { selected });
              }}
              onConfigure={(id, operation, parameters) => {
                updateSelection(id, {
                  selected: true,
                  operation_code: operation,
                  parameters,
                });
              }}
              onSelectSafe={() => {
                setSelections(initialSelections(recommendations));
                setPreview(null);
              }}
              onClear={() => {
                setSelections((current) => {
                  const next = { ...current };
                  for (const key of Object.keys(next)) {
                    const item = next[key];
                    if (item) {
                      next[key] = { ...item, selected: false };
                    }
                  }
                  return next;
                });
                setPreview(null);
              }}
            />
          )}
          {steps.length > 0 ? (
            <section aria-labelledby="cleanup-order">
              <h3 id="cleanup-order" className="text-sm font-medium text-ink">
                FACILIO will perform these steps in this order
              </h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-secondary">
                {steps.map((step) => (
                  <li key={`${step.operation_code}-${asText(step.parameters.column)}`}>
                    {humanStep(
                      step,
                      recommendations.find(
                        (item) => item.recommendation_id === step.recommendation_id,
                      ),
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {hasConflicts ? (
            <Callout tone="warning" title="Two selected cleanup steps conflict">
              {Object.values(conflictById)[0] ??
                "Choose one option for the conflicting column, then preview again."}{" "}
              No cleaned version was created.
            </Callout>
          ) : null}
          {steps.length === 0 && actionable.length > 0 ? (
            <p className="text-sm text-ink-secondary" role="status">
              Choose at least one cleanup step to continue.
            </p>
          ) : null}
          {incomplete ? (
            <p className="text-sm text-warning" role="status">
              Choose a fill value before preview.
            </p>
          ) : null}
          {previewError ? (
            <RecoveryMessage
              experience={previewError}
              actions={
                previewError.retrySafe ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void runPreview();
                    }}
                  >
                    Preview again
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={onLeave}>
                    Back to Problems
                  </Button>
                )
              }
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <DisabledHint
              disabled={
                steps.length === 0 ||
                incomplete ||
                hasConflicts ||
                previewMutation.isPending
              }
              reason={previewDisabledReason}
            >
              <Button
                onClick={() => {
                  void runPreview();
                }}
                disabled={
                  steps.length === 0 ||
                  incomplete ||
                  hasConflicts ||
                  previewMutation.isPending
                }
              >
                {previewMutation.isPending ? "Previewing…" : "Preview cleanup"}
              </Button>
            </DisabledHint>
            <Button variant="secondary" onClick={onLeave}>
              Back to Problems
            </Button>
            <Button variant="ghost" onClick={onManualClean}>
              Open manual Clean
            </Button>
          </div>
        </>
      ) : null}

      {stage === "preview" && preview ? (
        <>
          <CleanupPreviewView preview={preview} versionNumber={versionNumber} />
          <div className="flex flex-wrap gap-2">
            <DisabledHint
              disabled={preview.no_op}
              reason="These steps wouldn't change this version, so FACILIO will not create a redundant version."
            >
              <Button
                onClick={() => {
                  setStage("approve");
                }}
                disabled={preview.no_op}
              >
                Continue to approval
              </Button>
            </DisabledHint>
            <Button
              variant="secondary"
              onClick={() => {
                setStage("review");
              }}
            >
              Review fixes
            </Button>
            {preview.no_op ? (
              <Button variant="ghost" onClick={onLeave}>
                Back to Problems
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      {stage === "approve" && preview ? (
        <>
          {applyError ? (
            <RecoveryMessage
              experience={applyError}
              actions={
                <div className="flex flex-wrap gap-2">
                  {applyError.retrySafe ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        void runApply();
                      }}
                    >
                      Try again
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setStage("review");
                    }}
                  >
                    Review cleanup
                  </Button>
                </div>
              }
            />
          ) : null}
          <CleanupApproval
            preview={preview}
            steps={steps}
            recommendations={recommendations}
            acknowledged={acknowledged}
            onAcknowledge={setAcknowledged}
            onBack={() => {
              setStage("preview");
            }}
            confirming={applyMutation.isPending}
            onConfirm={() => {
              announce("Cleanup started");
              void runApply();
            }}
          />
        </>
      ) : null}

      {stage === "result" && result ? (
        <CleanupResult
          result={result}
          steps={appliedSteps}
          profiling={retryProfile.isPending}
          onCompare={() => {
            if (result.output_version_id) {
              onOpenVersion(result.output_version_id, "history");
            }
          }}
          onOpenData={() => {
            if (result.output_version_id) {
              onOpenVersion(result.output_version_id, "data");
            }
          }}
          onSave={() => {
            setSaveOpen(true);
          }}
          onDone={() => {
            if (result.output_version_id) {
              onOpenVersion(result.output_version_id, "problems");
            } else {
              onLeave();
            }
          }}
          onRetryProfile={() => {
            if (result.output_version_id) {
              retryProfile.mutate(result.output_version_id);
            }
          }}
        />
      ) : null}

      <SaveCleanupDialog
        open={saveOpen}
        steps={appliedSteps}
        saving={saveMutation.isPending}
        error={saveMutation.error}
        onClose={() => {
          setSaveOpen(false);
        }}
        onSave={(name, description) => {
          void saveMutation
            .mutateAsync({
              name,
              description,
              steps: appliedSteps.map((step) => ({
                operation_code: step.operation_code,
                parameters: step.parameters,
              })),
            })
            .then((workflow) => {
              setSaveOpen(false);
              void navigate(`/workflows/${workflow.id}`);
            })
            .catch(() => {
              /* dialog shows error; cleaned version remains */
            });
        }}
      />
    </div>
  );
}
