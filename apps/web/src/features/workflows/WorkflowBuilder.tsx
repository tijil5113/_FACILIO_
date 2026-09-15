import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowDown, ArrowUp, GripVertical, Pause, Play, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import {
  useDatasetsQuery,
  useDatasetVersionsQuery,
  useTransformationCatalogQuery,
} from "@/features/datasets/queries";
import {
  categoryLabel,
  defaultParameters,
  groupOperations,
  stepSummary,
} from "@/features/transform/operation-utils";
import { OperationForm } from "@/features/transform/OperationForm";
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
  useWorkflowRunsQuery,
  useWorkflowValidationQuery,
} from "@/features/workflows/queries";
import { formatCount, formatDateTime, formatScore } from "@/lib/format";
import { operationDisplayName } from "@/lib/operation-labels";
import { jobStatusLabel, workflowStatusLabel } from "@/lib/status-labels";
import { ResourceNotFound } from "@/features/recovery/ResourceNotFound";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { DisabledHint } from "@/components/ui/DisabledHint";
import { useUiStore } from "@/stores/ui-store";
import { ApiClientError } from "@/types/api";
import type { DatasetColumn } from "@/types/dataset";
import type { TransformationDefinition } from "@/types/transformations";
import type { WorkflowPreview, WorkflowStep } from "@/types/workflows";
import type { WorkflowRunAccepted } from "@/services/workflows";

interface WorkflowBuilderProps {
  workflowId: string;
}

export function WorkflowBuilder({ workflowId }: WorkflowBuilderProps) {
  const navigate = useNavigate();
  const showNotice = useUiStore((state) => state.showNotice);
  const workflowQuery = useWorkflowQuery(workflowId);
  const catalogQuery = useTransformationCatalogQuery();
  const datasetsQuery = useDatasetsQuery(1, 50);
  const [datasetId, setDatasetId] = useState("");
  const versionsQuery = useDatasetVersionsQuery(datasetId || undefined);
  const [versionId, setVersionId] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed">("saved");
  const [preview, setPreview] = useState<WorkflowPreview | null>(null);
  const [runResult, setRunResult] = useState<WorkflowRunAccepted | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteWorkflow, setConfirmDeleteWorkflow] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [builderPanel, setBuilderPanel] = useState<"catalog" | "steps" | "config">(
    "steps",
  );

  const workflow = workflowQuery.data;
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
  const historyQuery = useWorkflowRunsQuery({ workflow_id: workflowId, page_size: 8 });
  const validationQuery = useWorkflowValidationQuery(
    workflowId,
    datasetId && versionId ? { dataset_id: datasetId, version_id: versionId } : undefined,
    workflow?.revision,
  );

  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
    }
  }, [workflow]);

  useEffect(() => {
    const first = datasetsQuery.data?.items[0];
    if (!datasetId && first) {
      setDatasetId(first.id);
    }
  }, [datasetId, datasetsQuery.data]);

  useEffect(() => {
    const versions = versionsQuery.data ?? [];
    const current = versions.find((item) => item.is_current) ?? versions[0];
    if (current && !versions.some((item) => item.id === versionId)) {
      setVersionId(current.id);
    }
  }, [versionId, versionsQuery.data]);

  const operations = catalogQuery.data ?? [];
  const filtered = operations.filter((item) => {
    const hay = `${item.display_name} ${item.description} ${item.category}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });
  const grouped = useMemo(() => groupOperations(filtered), [filtered]);
  const steps = workflow?.steps ?? [];
  const selected = steps.find((item) => item.id === selectedStepId) ?? null;
  const selectedDef =
    operations.find((item) => item.code === selected?.operation_code) ?? null;
  const inputVersion = versionsQuery.data?.find((item) => item.id === versionId);
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

  function persistName() {
    if (!workflow || name.trim() === workflow.name) {
      return;
    }
    setSaveState("saving");
    patchWorkflow.mutate(
      { name: name.trim(), expected_revision: workflow.revision },
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
          const last = data.steps[data.steps.length - 1];
          if (last) {
            setSelectedStepId(last.id);
            setBuilderPanel("config");
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

  function onDrop(targetId: string) {
    if (!draggingId || draggingId === targetId || !workflow) {
      setDraggingId(null);
      return;
    }
    const ids = steps.map((item) => item.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      return;
    }
    const reordered = [...ids];
    const [removed] = reordered.splice(from, 1);
    if (!removed) {
      setDraggingId(null);
      return;
    }
    reordered.splice(to, 0, removed);
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
    setDraggingId(null);
  }

  if (workflowQuery.isLoading) {
    return (
      <div className="page-enter space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[480px] w-full" />
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

  const runDisabledReason = archived
    ? "Restore this Cleanup before running it."
    : !datasetId || !versionId
      ? "Select a dataset and version first."
      : validation?.valid !== true
        ? "This Cleanup doesn’t match the selected data or still needs valid steps."
        : preview?.no_op
          ? "These steps wouldn’t change this version."
          : undefined;

  const canRun =
    !archived &&
    Boolean(datasetId && versionId) &&
    validation?.valid === true &&
    !preview?.no_op;

  return (
    <div className="page-enter space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
            Cleanup
          </p>
          <input
            aria-label="Cleanup name"
            className="mt-1 w-full max-w-xl border-0 bg-transparent text-[22px] font-semibold tracking-tight text-ink outline-none"
            value={name}
            disabled={archived}
            onChange={(event) => {
              setName(event.target.value);
            }}
            onBlur={persistName}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <Badge
              tone={
                workflow.status === "READY"
                  ? "success"
                  : workflow.status === "INVALID"
                    ? "danger"
                    : "neutral"
              }
            >
              {workflowStatusLabel(workflow.status)}
            </Badge>
            <span aria-live="polite">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "failed"
                  ? "Save failed"
                  : "Saved"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-ink-secondary">
            Dataset
            <select
              className="ml-2 h-9 rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-sm"
              value={datasetId}
              onChange={(event) => {
                setDatasetId(event.target.value);
                setVersionId("");
                setPreview(null);
              }}
            >
              <option value="">Select dataset</option>
              {(datasetsQuery.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-secondary">
            Version
            <select
              className="ml-2 h-9 rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-sm"
              value={versionId}
              onChange={(event) => {
                setVersionId(event.target.value);
                setPreview(null);
              }}
            >
              <option value="">Select version</option>
              {(versionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  V{item.version_number}
                  {item.is_current ? " · current" : ""}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              if (datasetId && versionId) {
                setRunResult(null);
                previewMutation.mutate(
                  { dataset_id: datasetId, version_id: versionId },
                  { onSuccess: setPreview },
                );
              }
            }}
            disabled={!datasetId || !versionId || archived}
          >
            {previewMutation.isPending ? "Previewing…" : "Preview changes"}
          </Button>
          <DisabledHint
            disabled={!canRun || runMutation.isPending}
            reason={runDisabledReason}
          >
            <Button
              onClick={() => {
                if (datasetId && versionId && !preview?.no_op) {
                  runMutation.mutate(
                    { dataset_id: datasetId, version_id: versionId },
                    { onSuccess: setRunResult },
                  );
                }
              }}
              disabled={!canRun || runMutation.isPending}
            >
              {runMutation.isPending ? "Starting…" : "Run cleanup"}
            </Button>
          </DisabledHint>
        </div>
      </header>

      {archived ? (
        <Callout tone="warning" title="Archived">
          This workflow remains inspectable. Restore it before editing or running.
        </Callout>
      ) : null}
      {validation?.compatibility && !validation.compatibility.compatible ? (
        <Callout
          tone="danger"
          title={`${String(validation.compatibility.reasons.length)} compatibility issues`}
        >
          <ul className="list-disc pl-4">
            {validation.compatibility.reasons.map((reason) => (
              <li key={reason.message}>{reason.message}</li>
            ))}
          </ul>
        </Callout>
      ) : validation?.compatibility?.compatible ? (
        <p className="text-sm text-ink-secondary">
          Compatible with the selected version.
        </p>
      ) : null}

      <div className="xl:hidden">
        <SegmentedControl<"catalog" | "steps" | "config">
          legend="Builder sections"
          value={builderPanel}
          onChange={setBuilderPanel}
          options={[
            { value: "catalog", label: "Actions" },
            { value: "steps", label: "Steps" },
            { value: "config", label: "Configure" },
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside
          className={`rounded-[var(--facilio-radius-md)] border border-line bg-surface p-3 ${
            builderPanel === "catalog" ? "block" : "hidden xl:block"
          }`}
        >
          <Input
            id="operation-search"
            label="Cleanup actions"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="trim, fill, rename…"
          />
          <div className="mt-3 space-y-3">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="mb-1 font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
                  {categoryLabel(category)}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.code}>
                      <button
                        type="button"
                        className="w-full rounded-[var(--facilio-radius-sm)] px-2 py-1.5 text-left text-sm text-ink hover:bg-subtle"
                        onClick={() => {
                          onAdd(item);
                        }}
                        disabled={archived}
                      >
                        {operationDisplayName(item.code, item.display_name)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <ol
          className={`space-y-2 ${builderPanel === "steps" ? "block" : "hidden xl:block"}`}
          aria-label="Steps"
        >
          <li className="rounded-[var(--facilio-radius-md)] border border-dashed border-line px-4 py-3">
            <p className="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
              Input
            </p>
            <p className="text-sm text-ink">
              {datasetsQuery.data?.items.find((item) => item.id === datasetId)?.name ??
                "Select a dataset"}
              {inputVersion ? ` · V${String(inputVersion.version_number)}` : ""}
            </p>
          </li>
          {steps.map((step, index) => {
            const definition = operations.find(
              (item) => item.code === step.operation_code,
            );
            const stepValidation = validation?.steps.find(
              (item) => item.step_id === step.id,
            );
            const invalid = Boolean(
              step.enabled && stepValidation && !stepValidation.valid,
            );
            return (
              <li
                key={step.id}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => {
                  onDrop(step.id);
                }}
              >
                <div
                  className={`flex gap-2 rounded-[var(--facilio-radius-md)] border px-3 py-3 ${
                    selectedStepId === step.id
                      ? "border-ink bg-subtle"
                      : "border-line bg-surface"
                  } ${step.enabled ? "" : "opacity-60"}`}
                >
                  <button
                    type="button"
                    className="mt-1 text-ink-muted"
                    aria-label={`Drag to reorder step ${String(index + 1)}`}
                    draggable={!archived}
                    onDragStart={() => {
                      setDraggingId(step.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                    }}
                  >
                    <GripVertical size={16} />
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setSelectedStepId(step.id);
                      setBuilderPanel("config");
                    }}
                  >
                    <p className="font-mono text-[11px] text-ink-muted">
                      {String(index + 1).padStart(2, "0")}
                      {invalid ? " · invalid" : ""}
                      {step.enabled ? "" : " · disabled"}
                    </p>
                    <p className="text-sm font-medium text-ink">
                      {operationDisplayName(
                        step.operation_code,
                        definition?.display_name,
                      )}
                    </p>
                    <p className="text-xs text-ink-secondary">
                      {stepSummary(step.parameters)}
                    </p>
                    {stepValidation?.issues[0] ? (
                      <p className="mt-1 text-xs text-danger">
                        {stepValidation.issues[0].message}
                      </p>
                    ) : null}
                  </button>
                  <div className="flex flex-col">
                    <IconButton
                      label="Move step up"
                      disabled={index === 0 || archived}
                      onClick={() => {
                        move(step, -1);
                      }}
                    >
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton
                      label="Move step down"
                      disabled={index === steps.length - 1 || archived}
                      onClick={() => {
                        move(step, 1);
                      }}
                    >
                      <ArrowDown size={14} />
                    </IconButton>
                    <IconButton
                      label={step.enabled ? "Disable step" : "Enable step"}
                      disabled={archived}
                      onClick={() => {
                        setSaveState("saving");
                        patchStep.mutate(
                          {
                            stepId: step.id,
                            enabled: !step.enabled,
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
                    >
                      {step.enabled ? <Pause size={14} /> : <Play size={14} />}
                    </IconButton>
                    <IconButton
                      label="Delete step"
                      disabled={archived}
                      onClick={() => {
                        setConfirmDelete(step.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
                <div
                  className="flex justify-center py-1 text-ink-muted"
                  aria-hidden="true"
                >
                  ↓
                </div>
              </li>
            );
          })}
          <li className="rounded-[var(--facilio-radius-md)] border border-dashed border-line px-4 py-3">
            <p className="font-mono text-[10px] tracking-[0.12em] text-ink-muted uppercase">
              Output
            </p>
            <p className="text-sm text-ink-secondary">
              One derived version is created when this workflow runs successfully.
            </p>
          </li>
        </ol>

        <aside
          className={`rounded-[var(--facilio-radius-md)] border border-line bg-surface p-4 ${
            builderPanel === "config" ? "block" : "hidden xl:block"
          }`}
        >
          {selected && selectedDef ? (
            <>
              <h2 className="text-sm font-medium text-ink">
                {operationDisplayName(selectedDef.code, selectedDef.display_name)}
              </h2>
              <div className="mt-3">
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
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Select a step to configure it. Choose a cleanup action to add it.
            </p>
          )}
        </aside>
      </div>

      {previewMutation.isError ? (
        <RecoveryMessage
          experience={mapRecoveryError(previewMutation.error, {
            operation: "preview",
            action: "Preview cleanup",
            resourceId: workflowId,
          })}
        />
      ) : null}
      {runMutation.isError ? (
        <RecoveryMessage
          experience={mapRecoveryError(runMutation.error, {
            operation: "workflow-run",
            action: "Run cleanup",
            resourceId: workflowId,
          })}
        />
      ) : null}
      {preview ? <PreviewDrawer preview={preview} /> : null}
      {runResult ? (
        <RunOutcome
          run={runResult}
          datasetId={datasetId}
          onOpenJob={() => {
            void navigate(`/jobs/${runResult.job.id}`);
          }}
        />
      ) : null}

      <section className="rounded-[var(--facilio-radius-md)] border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-ink">History</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
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
            {archived ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  restore.mutate(workflowId);
                }}
              >
                Restore
              </Button>
            ) : (
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
        </div>
        {(historyQuery.data?.items ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">No runs yet.</p>
        ) : (
          <ul className="space-y-2">
            {historyQuery.data?.items.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/runs/${item.id}`}
                  className="block rounded-[var(--facilio-radius-sm)] border border-line px-3 py-2 text-sm hover:bg-subtle"
                >
                  {jobStatusLabel(item.status)} · V{item.input_version_number ?? "—"}
                  {item.output_version_number
                    ? ` → V${String(item.output_version_number)}`
                    : ""}{" "}
                  · {item.step_count} steps ·{" "}
                  {item.started_at ? formatDateTime(item.started_at) : "queued"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TechnicalDetails>
        <p>Workflow ID: {workflow.id}</p>
        <p>Revision: {String(workflow.revision)}</p>
        {selected ? <p>Operation code: {selected.operation_code}</p> : null}
      </TechnicalDetails>

      <Dialog
        open={confirmDelete != null}
        title="Delete step"
        onClose={() => {
          setConfirmDelete(null);
        }}
      >
        <div className="p-5">
          <p className="text-sm text-ink-secondary">
            Remove this step from the cleanup? Past runs keep their results. Your datasets
            are not deleted.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirmDelete) {
                  setSaveState("saving");
                  deleteStep.mutate(confirmDelete, {
                    onSuccess: () => {
                      setSaveState("saved");
                    },
                    onError: () => {
                      setSaveState("failed");
                    },
                  });
                }
                setConfirmDelete(null);
              }}
            >
              Delete step
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={confirmDeleteWorkflow}
        title="Delete cleanup"
        onClose={() => {
          setConfirmDeleteWorkflow(false);
        }}
      >
        <div className="p-5">
          <h2 className="text-base font-semibold text-ink">Delete “{workflow.name}”?</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            This removes the saved cleanup definition. Datasets and versions already
            created stay in place. This cannot be undone.
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
                  onSuccess: () => {
                    showNotice("Cleanup deleted.");
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

function PreviewDrawer({ preview }: { preview: WorkflowPreview }) {
  return (
    <section className="rounded-[var(--facilio-radius-md)] border border-line bg-surface p-4">
      <h2 className="text-sm font-medium text-ink">Preview changes</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        Nothing is saved until you run the cleanup. Your original stays unchanged.
      </p>
      {preview.no_op ? (
        <Callout tone="info" title="No changes would be produced">
          Run is disabled so FACILIO does not create an identical derived version.
        </Callout>
      ) : null}
      <dl className="mt-3 grid gap-2 sm:grid-cols-4">
        <Metric
          label="Rows"
          value={`${String(preview.rows_before)} → ${String(preview.rows_after)}`}
        />
        <Metric
          label="Columns"
          value={`${String(preview.columns_before)} → ${String(preview.columns_after)}`}
        />
        <Metric
          label="Projected quality"
          value={`${formatScore(preview.projected_quality?.before ?? null)} → ${formatScore(preview.projected_quality?.after ?? null)}`}
        />
        <Metric label="Enabled steps" value={formatCount(preview.steps.length)} />
      </dl>
      <ol className="mt-4 space-y-3">
        {preview.steps.map((step, index) => (
          <li key={step.step_id} className="border-t border-line pt-3">
            <p className="text-sm font-medium text-ink">
              {String(index + 1).padStart(2, "0")}{" "}
              {operationDisplayName(step.operation_code)}
            </p>
            <p className="text-sm text-ink-secondary">{step.summary}</p>
            {step.impact ? (
              <p className="text-xs text-ink-muted">
                {String(step.impact.rows_before)} → {String(step.impact.rows_after)} rows
                · {formatCount(step.impact.changed_cell_count)} values changed
                {step.impact.no_op ? " · NO CHANGES" : ""}
              </p>
            ) : null}
            {step.examples.length > 0 ? (
              <table className="mt-2 w-full text-left text-xs">
                <caption className="sr-only">Before and after examples</caption>
                <thead>
                  <tr>
                    <th className="pr-3 font-medium">Before</th>
                    <th className="font-medium">After</th>
                  </tr>
                </thead>
                <tbody>
                  {step.examples.slice(0, 5).map((example, exampleIndex) => (
                    <tr key={exampleIndex}>
                      <td className="py-1 font-mono">{displayCell(example.before)}</td>
                      <td className="py-1 font-mono">{displayCell(example.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function RunOutcome({
  run,
  datasetId,
  onOpenJob,
}: {
  run: WorkflowRunAccepted;
  datasetId: string;
  onOpenJob: () => void;
}) {
  const job = run.job;
  if (
    job.status === "QUEUED" ||
    job.status === "RUNNING" ||
    job.status === "CANCEL_REQUESTED"
  ) {
    return (
      <Callout tone="info" title="Cleanup started">
        <p>This cleanup is running in the background. Your original data is unchanged.</p>
        <Button className="mt-3" variant="secondary" onClick={onOpenJob}>
          View activity
        </Button>
      </Callout>
    );
  }
  if (job.status === "FAILED" || run.workflow_run.status === "FAILED") {
    return (
      <Callout tone="danger" title="Cleanup didn't finish">
        <p>{job.error_message_safe ?? run.workflow_run.error_message_safe}</p>
        <p className="mt-2">
          Input dataset was not modified. No cleaned version was created.
        </p>
        <Button className="mt-3" variant="secondary" onClick={onOpenJob}>
          View activity
        </Button>
      </Callout>
    );
  }
  return (
    <Callout tone="success" title="Cleanup finished">
      <p>
        Input V{run.workflow_run.input_version_number ?? "—"} → Cleaned V
        {run.workflow_run.output_version_number ?? "—"}
      </p>
      <p className="mt-1">The original version was not overwritten.</p>
      <div className="mt-3 flex gap-2">
        {job.output_version_id ? (
          <Link
            className="inline-flex h-8 items-center rounded-[var(--facilio-radius-md)] border border-line px-3 text-sm"
            to={`/datasets/${datasetId}?version=${job.output_version_id}`}
          >
            Open cleaned version
          </Link>
        ) : null}
        <Button variant="secondary" onClick={onOpenJob}>
          View activity
        </Button>
      </div>
    </Callout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--facilio-radius-sm)] border border-line px-3 py-2">
      <dt className="font-mono text-[10px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="text-sm tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function displayCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "(blank)";
  }
  if (typeof value === "string") {
    if (value !== value.trim()) {
      return `"${value}"`;
    }
    return value || "(empty string)";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
