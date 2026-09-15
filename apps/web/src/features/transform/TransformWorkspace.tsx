import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
  useApplyTransformationMutation,
  usePreviewTransformationMutation,
  useTransformationCatalogQuery,
} from "@/features/datasets/queries";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { formatCount } from "@/lib/format";
import { operationDisplayName } from "@/lib/operation-labels";
import { ApiClientError } from "@/types/api";
import type { DatasetColumn } from "@/types/dataset";
import type {
  ChangeExample,
  TransformationDefinition,
  TransformationPreview,
} from "@/types/transformations";

interface TransformWorkspaceProps {
  open: boolean;
  variant?: "dialog" | "inline";
  datasetId: string;
  versionId: string;
  versionNumber: number;
  columns: DatasetColumn[];
  initialOperation?: string;
  initialParameters?: Record<string, unknown>;
  onClose: () => void;
  onApplied: (versionId: string, versionNumber: number, summary: string) => void;
}

export function TransformWorkspace({
  open,
  variant = "dialog",
  datasetId,
  versionId,
  versionNumber,
  columns,
  initialOperation,
  initialParameters,
  onClose,
  onApplied,
}: TransformWorkspaceProps) {
  const catalogQuery = useTransformationCatalogQuery();
  const [search, setSearch] = useState("");
  const [operationCode, setOperationCode] = useState(initialOperation ?? "");
  const [parameters, setParameters] = useState<Record<string, unknown>>(
    initialParameters ?? {},
  );
  const [preview, setPreview] = useState<TransformationPreview | null>(null);
  const previewMutation = usePreviewTransformationMutation(datasetId, versionId);
  const applyMutation = useApplyTransformationMutation(datasetId, versionId);

  useEffect(() => {
    if (!open) {
      return;
    }
    setOperationCode(initialOperation ?? "");
    setParameters(initialParameters ?? {});
    setPreview(null);
    previewMutation.reset();
    applyMutation.reset();
    // Mutations are reset on open; including them in deps would retrigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialOperation, initialParameters, versionId]);

  const operations = catalogQuery.data ?? [];
  const selected = operations.find((item) => item.code === operationCode) ?? null;
  const filtered = operations.filter((item) => {
    const hay =
      `${operationDisplayName(item.code, item.display_name)} ${item.display_name} ${item.description} ${item.category} ${item.code}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });
  const grouped = useMemo(() => groupOperations(filtered), [filtered]);

  function runPreview() {
    if (!selected) {
      return;
    }
    previewMutation.reset();
    applyMutation.reset();
    previewMutation.mutate(
      { operation: selected.code, parameters },
      {
        onSuccess: (data) => {
          setPreview(data);
        },
      },
    );
  }

  function runApply() {
    if (!selected || !preview || preview.impact.no_op || applyMutation.isPending) {
      return;
    }
    applyMutation.mutate(
      { operation: selected.code, parameters },
      {
        onSuccess: (data) => {
          onApplied(data.version.id, data.version.version_number, data.summary);
        },
      },
    );
  }

  const body = (
    <div
      className={variant === "inline" ? "flex flex-col" : "flex max-h-[90vh] flex-col"}
    >
      <div className="border-b border-line px-5 py-4">
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
          Clean data
        </p>
        <h2 className="mt-1 text-lg font-semibold text-ink">
          Choose a cleanup action, preview, then create a version
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Working from V{String(versionNumber)}. FACILIO will create a new version. Your
          original stays unchanged.
        </p>
      </div>
      <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.1fr)]">
        <section
          className="border-b border-line p-4 lg:border-r lg:border-b-0"
          aria-label="Operations"
        >
          <Input
            id="operation-search"
            label="Cleanup actions"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="spaces, missing, duplicates…"
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
                        className={`w-full rounded-[var(--facilio-radius-sm)] px-2 py-1.5 text-left text-sm ${
                          item.code === operationCode
                            ? "bg-ink text-canvas dark:text-[#121410]"
                            : "text-ink hover:bg-subtle"
                        }`}
                        disabled={
                          !item.dataset_level &&
                          compatibleColumns(item, columns).length === 0
                        }
                        title={
                          !item.dataset_level &&
                          compatibleColumns(item, columns).length === 0
                            ? "No columns in this version match the types this operation supports."
                            : undefined
                        }
                        onClick={() => {
                          setOperationCode(item.code);
                          const scoped = compatibleColumns(item, columns);
                          setParameters(
                            defaultParameters(
                              item,
                              scoped.length > 0 ? scoped : columns,
                              {},
                            ),
                          );
                          setPreview(null);
                        }}
                      >
                        {operationDisplayName(item.code, item.display_name)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <section
          className="border-b border-line p-4 lg:border-r lg:border-b-0"
          aria-label="Configuration"
        >
          {selected ? (
            <>
              <OperationForm
                definition={selected}
                columns={
                  selected.dataset_level ? columns : compatibleColumns(selected, columns)
                }
                allColumns={columns}
                parameters={parameters}
                onChange={(next) => {
                  setParameters(next);
                  setPreview(null);
                }}
              />
              <div className="mt-4">
                <TechnicalDetails>
                  <p>Operation code: {selected.code}</p>
                </TechnicalDetails>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Select an operation to configure it.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={runPreview}
              disabled={!selected || previewMutation.isPending}
            >
              Preview changes
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
          {previewMutation.isError ? (
            <div className="mt-3">
              <RecoveryMessage
                experience={mapRecoveryError(previewMutation.error, {
                  operation: "preview",
                  action: "Preview cleanup",
                  resourceId: datasetId,
                })}
              />
            </div>
          ) : null}
        </section>
        <section className="p-4" aria-label="Preview">
          {preview ? (
            <PreviewPanel
              preview={preview}
              applying={applyMutation.isPending}
              applyError={
                applyMutation.error instanceof ApiClientError
                  ? applyMutation.error.message
                  : applyMutation.isError
                    ? "The transformation could not be applied."
                    : null
              }
              onApply={runApply}
            />
          ) : (
            <p className="text-sm text-ink-muted">
              Preview is required before apply. No version is created until you apply.
            </p>
          )}
        </section>
      </div>
    </div>
  );

  if (variant === "inline") {
    return body;
  }

  return (
    <Dialog
      open={open}
      title="Clean data"
      onClose={onClose}
      className="max-h-[90vh] max-w-5xl overflow-hidden"
    >
      {body}
    </Dialog>
  );
}

function OperationForm({
  definition,
  columns,
  allColumns,
  parameters,
  onChange,
}: {
  definition: TransformationDefinition;
  columns: DatasetColumn[];
  allColumns: DatasetColumn[];
  parameters: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const selectedColumn = allColumns.find((column) => column.name === parameters.column);
  const numericColumn =
    selectedColumn?.dtype === "integer" || selectedColumn?.dtype === "decimal";

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-ink-secondary">{definition.description}</p>
      {definition.code === "DROP_COLUMN" ? (
        <Callout tone="warning" title="Removes a column from the new version">
          The parent version keeps the column. FACILIO will not drop the last remaining
          column.
        </Callout>
      ) : null}
      {definition.notes.map((note) => (
        <p key={note} className="text-xs text-ink-muted">
          {note}
        </p>
      ))}
      {definition.parameters.map((spec) => {
        if (spec.type === "column") {
          return (
            <label
              key={spec.name}
              className="block text-xs font-medium text-ink-secondary"
            >
              {spec.description}
              <select
                className="mt-1 h-9 w-full rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-sm text-ink"
                value={scalarParam(parameters[spec.name])}
                onChange={(event) => {
                  onChange({ ...parameters, [spec.name]: event.target.value });
                }}
              >
                <option value="">Select column</option>
                {columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} ({column.dtype})
                  </option>
                ))}
              </select>
            </label>
          );
        }
        if (spec.type === "columns") {
          const selected = Array.isArray(parameters[spec.name])
            ? (parameters[spec.name] as string[])
            : [];
          return (
            <fieldset key={spec.name} className="text-xs">
              <legend className="font-medium text-ink-secondary">
                {spec.description}
              </legend>
              <div className="mt-2 space-y-1">
                {columns.map((column) => (
                  <label
                    key={column.name}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(column.name)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...selected, column.name]
                          : selected.filter((name) => name !== column.name);
                        onChange({ ...parameters, [spec.name]: next });
                      }}
                    />
                    {column.name}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }
        if (spec.type === "enum" && spec.options) {
          const options =
            definition.code === "FILL_MISSING" &&
            spec.name === "strategy" &&
            !numericColumn
              ? spec.options.filter((option) => option === "constant")
              : spec.options;
          return (
            <label
              key={spec.name}
              className="block text-xs font-medium text-ink-secondary"
            >
              {spec.description}
              <select
                className="mt-1 h-9 w-full rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-sm text-ink"
                value={scalarParam(parameters[spec.name] ?? spec.default)}
                onChange={(event) => {
                  onChange({ ...parameters, [spec.name]: event.target.value });
                }}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        const id = `${definition.code}-${spec.name}`;
        return (
          <Input
            key={spec.name}
            id={id}
            label={spec.description}
            value={scalarParam(parameters[spec.name])}
            onChange={(event) => {
              onChange({ ...parameters, [spec.name]: event.target.value });
            }}
          />
        );
      })}
    </div>
  );
}

function PreviewPanel({
  preview,
  applying,
  applyError,
  onApply,
}: {
  preview: TransformationPreview;
  applying: boolean;
  applyError: string | null;
  onApply: () => void;
}) {
  const impact = preview.impact;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">{preview.summary}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Metric
          label="Rows"
          value={`${String(impact.rows_before)} → ${String(impact.rows_after)}`}
        />
        <Metric
          label="Columns"
          value={`${String(impact.columns_before)} → ${String(impact.columns_after)}`}
        />
        <Metric label="Changed cells" value={formatCount(impact.changed_cell_count)} />
        <Metric label="Rows removed" value={formatCount(impact.removed_row_count)} />
      </dl>
      {preview.warnings.map((warning) => (
        <Callout key={warning} tone="warning" title="Review before applying">
          {warning}
        </Callout>
      ))}
      {impact.no_op ? (
        <Callout tone="info" title="No changes detected">
          This operation would not change any values. Apply is disabled so FACILIO does
          not create a redundant version.
        </Callout>
      ) : (
        <ExampleList examples={preview.examples} />
      )}
      {preview.operation === "DROP_COLUMN" && !impact.no_op ? (
        <p className="text-xs text-ink-muted">
          Column removal is structural in the derived version only. Restore an earlier
          version to keep the column in the working pointer.
        </p>
      ) : null}
      {applyError ? (
        <Callout tone="danger" title="Apply failed">
          {applyError}
        </Callout>
      ) : null}
      <p className="text-sm text-ink-secondary">
        FACILIO will create a new version. Your original stays unchanged.
      </p>
      <Button onClick={onApply} disabled={impact.no_op || applying}>
        {applying ? "Creating version…" : "Create cleaned version"}
      </Button>
    </div>
  );
}

function ExampleList({ examples }: { examples: ChangeExample[] }) {
  if (examples.length === 0) {
    return <p className="text-sm text-ink-muted">No sample changes to display.</p>;
  }
  return (
    <ul className="space-y-2" aria-label="Before and after examples">
      {examples.map((example, index) => (
        <li
          key={`${example.kind}-${String(example.row_index)}-${String(index)}`}
          className="rounded-[var(--facilio-radius-sm)] border border-line bg-subtle px-3 py-2 text-sm"
        >
          {example.kind === "cell" ? (
            <p>
              Row {String((example.row_index ?? 0) + 1)}
              {example.column ? ` · ${example.column}` : ""}:{" "}
              <span className="font-mono">{displayCell(example.before)}</span>
              <span className="text-ink-muted"> → </span>
              <span className="font-mono">{displayCell(example.after)}</span>
            </p>
          ) : null}
          {example.kind === "row_removed" ? (
            <p>
              Row {String((example.row_index ?? 0) + 1)} will be removed
              {example.reason ? ` (${example.reason})` : ""}.
            </p>
          ) : null}
          {example.kind === "column_removed" ? (
            <p>Column {example.column} will be removed from the new version.</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--facilio-radius-sm)] border border-line px-2 py-1.5">
      <dt className="font-mono text-[10px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function scalarParam(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function displayCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "(blank)";
  }
  if (typeof value === "string") {
    if (value === "") {
      return "(empty string)";
    }
    if (value !== value.trim()) {
      return `"${value}"`;
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function groupOperations(items: TransformationDefinition[]) {
  const groups: Record<string, TransformationDefinition[]> = {};
  for (const item of items) {
    const key = item.category;
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
  }
  return groups;
}

function categoryLabel(category: string): string {
  if (category === "CLEAN_TEXT") {
    return "Clean text";
  }
  if (category === "MISSING_DATA") {
    return "Missing data";
  }
  if (category === "ROWS") {
    return "Rows";
  }
  if (category === "COLUMNS") {
    return "Columns";
  }
  return category;
}

function mapColumnType(dtype: string): string {
  return dtype.toUpperCase();
}

function compatibleColumns(
  definition: TransformationDefinition,
  columns: DatasetColumn[],
): DatasetColumn[] {
  if (definition.dataset_level || definition.supported_column_types.length === 0) {
    return columns;
  }
  const allowed = new Set(
    definition.supported_column_types.map((item) => item.toUpperCase()),
  );
  return columns.filter((column) => allowed.has(mapColumnType(column.dtype)));
}

function defaultParameters(
  definition: TransformationDefinition,
  columns: DatasetColumn[],
  current: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };
  for (const spec of definition.parameters) {
    if (next[spec.name] !== undefined) {
      continue;
    }
    if (spec.default !== null && spec.default !== undefined) {
      next[spec.name] = spec.default;
    } else if (spec.type === "column" && columns[0]) {
      next[spec.name] = columns[0].name;
    } else if (spec.type === "columns") {
      next[spec.name] = columns.map((column) => column.name);
    }
  }
  return next;
}
