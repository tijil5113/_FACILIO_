import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";
import { scalarParam } from "@/features/transform/operation-utils";
import type { DatasetColumn } from "@/types/dataset";
import type { TransformationDefinition } from "@/types/transformations";

interface OperationFormProps {
  definition: TransformationDefinition;
  columns: DatasetColumn[];
  allColumns: DatasetColumn[];
  parameters: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function OperationForm({
  definition,
  columns,
  allColumns,
  parameters,
  onChange,
}: OperationFormProps) {
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
                {(columns.length > 0 ? columns : allColumns).map((column) => (
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
          const available = columns.length > 0 ? columns : allColumns;
          return (
            <fieldset key={spec.name} className="text-xs">
              <legend className="font-medium text-ink-secondary">
                {spec.description}
              </legend>
              <div className="mt-2 space-y-1">
                {available.map((column) => (
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
                {spec.options.map((option) => (
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
