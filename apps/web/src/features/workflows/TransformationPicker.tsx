import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
  groupedCatalog,
  transformationPickerDescription,
} from "@/features/workflows/step-language";
import { operationDisplayName } from "@/lib/operation-labels";
import type { TransformationDefinition } from "@/types/transformations";

interface TransformationPickerProps {
  open: boolean;
  operations: TransformationDefinition[];
  disabled?: boolean;
  onClose: () => void;
  onAdd: (definition: TransformationDefinition) => void;
}

export function TransformationPicker({
  open,
  operations,
  disabled = false,
  onClose,
  onAdd,
}: TransformationPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return operations;
    }
    return operations.filter((item) => {
      const hay = `${item.display_name} ${item.description} ${item.category} ${operationDisplayName(item.code, item.display_name)}`;
      return hay.toLowerCase().includes(query);
    });
  }, [operations, search]);
  const groups = groupedCatalog(filtered);
  const selected = operations.find((item) => item.code === selectedCode) ?? null;

  return (
    <Dialog
      open={open}
      title="Add cleaning step"
      description="What do you want to change?"
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-4 p-5">
        <div>
          <h2 className="type-card-title text-ink">Add a cleaning step</h2>
          <p className="type-body mt-1 text-ink-secondary">
            What do you want to change? Steps run from top to bottom.
          </p>
        </div>
        <Input
          id="transformation-search"
          label="Find a cleaning action"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          placeholder="spaces, missing values, duplicates…"
        />
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
            {groups.length === 0 ? (
              <p className="type-body-sm text-ink-muted">No cleaning actions match.</p>
            ) : (
              groups.map((group) => (
                <section key={group.key} aria-labelledby={`picker-${group.key}`}>
                  <h3
                    id={`picker-${group.key}`}
                    className="type-meta mb-2 text-ink-muted"
                  >
                    {group.label}
                  </h3>
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const selectedItem = selectedCode === item.code;
                      return (
                        <li key={item.code}>
                          <button
                            type="button"
                            className={`w-full rounded-[var(--facilio-radius-md)] px-3 py-2 text-left ${
                              selectedItem
                                ? "bg-surface-selected text-ink"
                                : "text-ink hover:bg-subtle"
                            }`}
                            aria-pressed={selectedItem}
                            onClick={() => {
                              setSelectedCode(item.code);
                            }}
                          >
                            <span className="block text-sm font-medium">
                              {operationDisplayName(item.code, item.display_name)}
                            </span>
                            <span className="type-caption mt-0.5 block text-ink-muted">
                              {transformationPickerDescription(item)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
          <aside className="rounded-[var(--facilio-radius-md)] border border-line bg-subtle p-3">
            {selected ? (
              <>
                <p className="type-card-title text-ink">
                  {operationDisplayName(selected.code, selected.display_name)}
                </p>
                <p className="type-body-sm mt-2 text-ink-secondary">
                  {transformationPickerDescription(selected)}
                </p>
                <TechnicalCode code={selected.code} />
              </>
            ) : (
              <p className="type-body-sm text-ink-muted">
                Choose an action to see what it changes.
              </p>
            )}
          </aside>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={disabled || !selected}
            onClick={() => {
              if (selected) {
                onAdd(selected);
                setSelectedCode(null);
                setSearch("");
              }
            }}
          >
            Add this step
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function TechnicalCode({ code }: { code: string }) {
  return (
    <p className="type-mono mt-3 text-[11px] text-ink-muted">
      Registered operation: {code}
    </p>
  );
}
