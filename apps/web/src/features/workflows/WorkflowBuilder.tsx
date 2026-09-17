import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { Drawer } from "@/components/ui/Drawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { Textarea } from "@/components/ui/Textarea";
import {
  useDatasetsQuery,
  useDatasetVersionsQuery,
  useTransformationCatalogQuery,
} from "@/features/datasets/queries";
import { useOperationsHealthQuery, useJobsQuery } from "@/features/jobs/queries";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { ResourceNotFound } from "@/features/recovery/ResourceNotFound";
import { defaultParameters } from "@/features/transform/operation-utils";
import { OperationForm } from "@/features/transform/OperationForm";
import { CleaningSteps } from "@/features/workflows/CleaningSteps";
import { RunCleanupDialog } from "@/features/workflows/RunCleanupDialog";
import { TransformationPicker } from "@/features/workflows/TransformationPicker";
import { activityOutcome } from "@/lib/activity-outcome";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { operationDisplayName } from "@/lib/operation-labels";
import { workflowStatusLabel } from "@/lib/status-labels";
import { useContextTitle } from "@/hooks/use-context-title";
import { useUiStore } from "@/stores/ui-store";
import { ApiClientError } from "@/types/api";
import type { DatasetColumn } from "@/types/dataset";
import type { TransformationDefinition } from "@/types/transformations";
import type { WorkflowPreview, WorkflowStep } from "@/types/workflows";
import type { WorkflowRunAccepted } from "@/services/workflows";
import {
  useAddStepMutation,
  useArchiveWorkflowMutation,
  useDeleteStepMutation,
  useDeleteWorkflowMutation,
  useDuplicateWorkflowMutation,
  usePatchStepMutation,
  usePatchWorkflowMutation,
  usePreviewWorkflowMutation,
  useReorderStepsMutation,
  useRestoreWorkflowMutation,
  useRunWorkflowMutation,
  useWorkflowQuery,
  useWorkflowValidationQuery,
} from "@/features/workflows/queries";

interface WorkflowBuilderProps {
  workflowId: string;
}

export function WorkflowBuilder({ workflowId }: WorkflowBuilderProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showNotice = useUiStore((state) => state.showNotice);
  const workflowQuery = useWorkflowQuery(workflowId);
  const catalogQuery = useTransformationCatalogQuery();
  const datasetsQuery = useDatasetsQuery(1, 50);
  const operationsHealth = useOperationsHealthQuery();
  const historyQuery = useJobsQuery({ workflow_id: workflowId, page_size: 8 });
  const [datasetId, setDatasetId] = useState("");
  const versionsQuery = useDatasetVersionsQuery(datasetId || undefined);
  const [versionId, setVersionId] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed">("saved");
  const [preview, setPreview] = useState<WorkflowPreview | null>(null);
  const [runResult, setRunResult] = useState<WorkflowRunAccepted | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [confirmDeleteWorkflow, setConfirmDeleteWorkflow] = useState(false);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const savedFromGuided = searchParams.get("saved") === "1";

  const workflow = workflowQuery.data;
  useContextTitle(workflow?.name ?? null);
  const addStep = useAddStepMutation(workflowId);
  const patchStep = usePatchStepMutation(workflowId);
  const deleteStep = useDeleteStepMutation(workflowId);
  const reorder = useReorderStepsMutation(workflowId);
  const patchWorkflow = usePatchWorkflowMutation(workflowId);
  const previewMutation = usePreviewWorkflowMutation(workflowId);
  const runMutation = useRunWorkflowMutation(workflowId);
  const duplicate = useDuplicateWorkflowMutation();
  const archive = useArchiveWorkflowMutation();
  const restore = useRestoreWorkflowMutation();
  const remove = useDeleteWorkflowMutation();
  const validationQuery = useWorkflowValidationQuery(
    workflowId,
    datasetId && versionId ? { dataset_id: datasetId, version_id: versionId } : undefined,
    workflow?.revision,
  );

  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description ?? "");
    }
  }, [workflow]);

  useEffect(() => {
    const versions = versionsQuery.data ?? [];
    const current = versions.find((item) => item.is_current) ?? versions[0];
    if (current && !versions.some((item) => item.id === versionId)) {
      setVersionId(current.id);
    }
  }, [versionId, versionsQuery.data]);

  const operations = catalogQuery.data ?? [];
  const steps = workflow?.steps ?? [];
  const selected = steps.find((item) => item.id === selectedStepId) ?? null;
  const selectedDef =
    operations.find((item) => item.code === selected?.operation_code) ?? null;
  const schemaColumns: DatasetColumn[] =
    validationQuery.data?.steps
      .find((item) => item.step_id === selected?.id)
      ?.schema_before.map((item, index) => ({
        name: item.name,
        index,
        dtype: item.dtype.toLowerCase() as DatasetColumn["dtype"],
      })) ??
    validationQuery.data?.projected_schema.map((item, index) => ({
      name: item.name,
      index,
      dtype: item.dtype.toLowerCase() as DatasetColumn["dtype"],
    })) ??
    [];
  const validation = validationQuery.data;
  const archived = workflow?.status === "ARCHIVED";
  const invalidStepIds = useMemo(() => {
    const ids = new Set<string>();
    for (const step of validation?.steps ?? []) {
      if (step.enabled && !step.valid) {
        ids.add(step.step_id);
      }
    }
    return ids;
  }, [validation?.steps]);
  const stepMessages = useMemo(() => {
    const messages: Record<string, string> = {};
    for (const step of validation?.steps ?? []) {
      if (step.issues[0]) {
        messages[step.step_id] = step.issues[0].message;
      }
    }
    return messages;
  }, [validation?.steps]);

  function persistIdentity() {
    if (!workflow) {
      return;
    }
    const nextName = name.trim();
    const nextDescription = description.trim();
    const currentDescription = workflow.description ?? "";
    if (nextName === workflow.name && nextDescription === currentDescription) {
      return;
    }
    if (!nextName) {
      setName(workflow.name);
      return;
    }
    setSaveState("saving");
    patchWorkflow.mutate(
      {
        name: nextName,
        description: nextDescription || null,
        expected_revision: workflow.revision,
      },
      {
        onSuccess: () => {
          setSaveState("saved");
        },
        onError: () => {
          setSaveState("failed");
        },
      },
    );
  }

  function onAdd(definition: TransformationDefinition) {
    if (!workflow || archived) {
      return;
    }
    setSaveState("saving");
    addStep.mutate(
      {
        operation_code: definition.code,
        parameters: defaultParameters(definition, schemaColumns, {}),
        expected_revision: workflow.revision,
      },
      {
        onSuccess: (data) => {
          setSaveState("saved");
          setPickerOpen(false);
          const last = data.steps[data.steps.length - 1];
          if (last) {
            setSelectedStepId(last.id);
            setMobileConfigOpen(true);
          }
        },
        onError: () => {
          setSaveState("failed");
        },
      },
    );
  }

  function move(step: WorkflowStep, direction: -1 | 1) {
    if (!workflow) {
      return;
    }
    const ids = steps.map((item) => item.id);
    const index = ids.indexOf(step.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ids.length) {
      return;
    }
    const reordered = [...ids];
    const [removed] = reordered.splice(index, 1);
    if (!removed) {
      return;
    }
    reordered.splice(next, 0, removed);
    setSaveState("saving");
    reorder.mutate(
      { stepIds: reordered, expectedRevision: workflow.revision },
      {
        onSuccess: () => {
          setSaveState("saved");
        },
        onError: () => {
          setSaveState("failed");
        },
      },
    );
  }

  if (workflowQuery.isLoading) {
    return (
      <div className="page-enter mx-auto max-w-4xl space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (workflowQuery.isError || !workflow) {
    const missing =
      workflowQuery.error instanceof ApiClientError &&
      (workflowQuery.error.code === "WORKFLOW_NOT_FOUND" ||
        workflowQuery.error.status === 404);
    if (missing) {
      return <ResourceNotFound resource="cleanup" error={workflowQuery.error} />;
    }
    return (
      <RecoveryMessage
        experience={mapRecoveryError(workflowQuery.error, {
          operation: "load",
          action: "Load cleanup",
          resourceId: workflowId,
        })}
      />
    );
  }

  const enabledCount = workflow.enabled_step_count;
  const workerAvailable = operationsHealth.data
    ? operationsHealth.data.worker.status === "available"
    : null;
  const queueUnavailable = operationsHealth.data?.queue.status === "unavailable";
  const configPanel =
    selected && selectedDef ? (
      <div className="space-y-3">
        <h2 className="type-section text-ink">
          {operationDisplayName(selectedDef.code, selectedDef.display_name)}
        </h2>
        <OperationForm
          definition={selectedDef}
          columns={schemaColumns}
          allColumns={schemaColumns}
          parameters={selected.parameters}
          onChange={(next) => {
            setSaveState("saving");
            patchStep.mutate(
              {
                stepId: selected.id,
                parameters: next,
                expected_revision: workflow.revision,
              },
              {
                onSuccess: () => {
                  setSaveState("saved");
                },
                onError: () => {
                  setSaveState("failed");
                },
              },
            );
          }}
        />
      </div>
    ) : (
      <p className="type-body-sm text-ink-muted">
        Select a step to configure it. Changing order may change the result.
      </p>
    );

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="type-meta text-ink-muted">Cleanup</p>
          <input
            aria-label="Cleanup name"
            className="type-page-title mt-1 w-full max-w-xl border-0 bg-transparent text-ink outline-none"
            value={name}
            disabled={archived}
            maxLength={200}
            onChange={(event) => {
              setName(event.target.value);
            }}
            onBlur={persistIdentity}
          />
          <Textarea
            id="cleanup-description"
            label="Description"
            className="mt-3 min-h-20"
            value={description}
            disabled={archived}
            maxLength={4000}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            onBlur={persistIdentity}
          />
          <p className="type-caption mt-2 text-ink-muted">
            {enabledCount} {enabledCount === 1 ? "step" : "steps"} · Updated{" "}
            {formatRelativeTime(workflow.updated_at)} ·{" "}
            {workflowStatusLabel(workflow.status)}
            <span className="ml-2" aria-live="polite">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "failed"
                  ? "Save failed"
                  : "Saved"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setRunResult(null);
              setPreview(null);
              setRunOpen(true);
            }}
            disabled={archived || enabledCount === 0}
          >
            Run Cleanup
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              duplicate.mutate(workflowId, {
                onSuccess: (copy) => {
                  void navigate(`/workflows/${copy.id}`);
                },
              });
            }}
          >
            Duplicate
          </Button>
        </div>
      </header>

      {savedFromGuided ? (
        <Callout
          tone="success"
          title="Cleaning steps saved"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("saved");
                setSearchParams(next, { replace: true });
              }}
            >
              Dismiss
            </Button>
          }
        >
          You're saving the cleaning steps you just used. You can run this Cleanup again
          when you need it.
        </Callout>
      ) : null}

      {saveState === "failed" ? (
        <Callout
          tone="danger"
          title="Couldn't save this Cleanup"
          action={
            <Button size="sm" variant="secondary" onClick={persistIdentity}>
              Try saving again
            </Button>
          }
        >
          Your latest edits are still on this page. FACILIO did not record them yet.
        </Callout>
      ) : null}

      {archived ? (
        <Callout
          tone="warning"
          title="Archived"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                restore.mutate(workflowId);
              }}
            >
              Restore
            </Button>
          }
        >
          This Cleanup remains inspectable. Restore it before editing or running.
        </Callout>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="type-section text-ink">Cleaning steps</h2>
            <p className="type-caption mt-1 text-ink-muted">
              Steps run from top to bottom. Changing order may change the result.
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={archived}
            onClick={() => {
              setPickerOpen(true);
            }}
          >
            Add cleaning step
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <CleaningSteps
            steps={steps}
            selectedStepId={selectedStepId}
            archived={archived}
            invalidStepIds={invalidStepIds}
            stepMessages={stepMessages}
            onSelect={(stepId) => {
              setSelectedStepId(stepId);
              setMobileConfigOpen(true);
            }}
            onMove={move}
            onRemove={(stepId) => {
              setSaveState("saving");
              deleteStep.mutate(stepId, {
                onSuccess: (data) => {
                  setSaveState("saved");
                  if (selectedStepId === stepId) {
                    setSelectedStepId(data.steps[0]?.id ?? null);
                    setMobileConfigOpen(false);
                  }
                },
                onError: () => {
                  setSaveState("failed");
                },
              });
            }}
          />
          <aside className="hidden rounded-[var(--facilio-radius-md)] border border-line bg-surface p-4 xl:block">
            {configPanel}
          </aside>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="type-section text-ink">Recent activity</h2>
        {(historyQuery.data?.items ?? []).length === 0 ? (
          <p className="type-body-sm text-ink-muted">
            This Cleanup has not been run yet.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-[var(--facilio-radius-md)] border border-line">
            {historyQuery.data?.items.map((item) => {
              const outcome = activityOutcome(item, {
                workerAvailable: workerAvailable !== false,
              });
              return (
                <li key={item.id}>
                  <Link
                    to={`/jobs/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-subtle"
                  >
                    <span className="text-ink">{outcome.headline}</span>
                    <span className="type-caption text-ink-muted">
                      {item.dataset_name ?? "Dataset"} ·{" "}
                      {formatRelativeTime(item.queued_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {archived ? null : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              archive.mutate(workflowId);
            }}
          >
            Archive
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setConfirmDeleteWorkflow(true);
          }}
        >
          Delete
        </Button>
      </div>

      <TechnicalDetails>
        <p>Workflow ID: {workflow.id}</p>
        <p>Revision: {String(workflow.revision)}</p>
        <p>Updated: {formatDateTime(workflow.updated_at)}</p>
        {selected ? <p>Selected operation: {selected.operation_code}</p> : null}
      </TechnicalDetails>

      <div className="xl:hidden">
        <Drawer
          open={mobileConfigOpen && selected != null}
          title="Configure step"
          onClose={() => {
            setMobileConfigOpen(false);
          }}
        >
          <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="type-section text-ink">Configure step</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMobileConfigOpen(false);
                }}
              >
                Done
              </Button>
            </div>
            {configPanel}
          </div>
        </Drawer>
      </div>

      <TransformationPicker
        open={pickerOpen}
        operations={operations}
        disabled={archived || addStep.isPending}
        onClose={() => {
          setPickerOpen(false);
        }}
        onAdd={onAdd}
      />

      <RunCleanupDialog
        open={runOpen}
        workflow={workflow}
        datasets={datasetsQuery.data?.items ?? []}
        versions={versionsQuery.data ?? []}
        datasetId={datasetId}
        versionId={versionId}
        validation={validation}
        preview={preview}
        previewPending={previewMutation.isPending}
        previewError={previewMutation.error}
        runPending={runMutation.isPending}
        runError={runMutation.error}
        runResult={runResult}
        workerAvailable={workerAvailable}
        queueUnavailable={queueUnavailable}
        onDatasetChange={(next) => {
          setDatasetId(next);
          setVersionId("");
          setPreview(null);
        }}
        onVersionChange={(next) => {
          setVersionId(next);
          setPreview(null);
        }}
        onPreview={() => {
          if (datasetId && versionId) {
            previewMutation.mutate(
              { dataset_id: datasetId, version_id: versionId },
              { onSuccess: setPreview },
            );
          }
        }}
        onRun={() => {
          if (datasetId && versionId && !preview?.no_op && !runMutation.isPending) {
            runMutation.mutate(
              { dataset_id: datasetId, version_id: versionId },
              { onSuccess: setRunResult },
            );
          }
        }}
        onClose={() => {
          setRunOpen(false);
        }}
      />

      <Dialog
        open={confirmDeleteWorkflow}
        title="Delete cleanup"
        onClose={() => {
          setConfirmDeleteWorkflow(false);
        }}
      >
        <div className="p-5">
          <h2 className="type-card-title text-ink">Delete “{workflow.name}”?</h2>
          <p className="type-body mt-2 text-ink-secondary">
            This removes the saved Cleanup definition. Past Activity and dataset versions
            are not deleted.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDeleteWorkflow(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                remove.mutate(workflowId, {
                  onSuccess: (result) => {
                    showNotice(
                      result.archived
                        ? "Cleanup archived because it has history."
                        : "Cleanup deleted.",
                    );
                    void navigate("/workflows");
                  },
                });
                setConfirmDeleteWorkflow(false);
              }}
            >
              Delete cleanup
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
