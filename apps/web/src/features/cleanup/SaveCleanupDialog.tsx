import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { operationDisplayName } from "@/lib/operation-labels";
import type { CleanupStep } from "@/types/cleanup";

interface SaveCleanupDialogProps {
  open: boolean;
  steps: CleanupStep[];
  saving: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

export function SaveCleanupDialog({
  open,
  steps,
  saving,
  error,
  onClose,
  onSave,
}: SaveCleanupDialogProps) {
  const [name, setName] = useState("Customer Data Cleanup");
  const [description, setDescription] = useState(
    "Save this cleanup and use it again on matching data.",
  );
  const message = error != null;

  return (
    <Dialog open={open} title="Save as cleanup" onClose={onClose}>
      <div className="space-y-4 px-5 py-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Save as cleanup</h2>
          <p className="mt-1 text-sm leading-6 text-ink-secondary">
            Save this cleanup and use it again on matching data. Your cleaned version is
            already safe.
          </p>
        </div>
        <Input
          id="cleanup-name"
          label="Name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <label
          className="block text-xs font-medium text-ink-secondary"
          htmlFor="cleanup-description"
        >
          Description
          <textarea
            id="cleanup-description"
            className="mt-1 min-h-20 w-full rounded-[var(--facilio-radius-md)] border border-line bg-raised px-3 py-2 text-sm text-ink"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
          />
        </label>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-secondary">
          {steps.map((step, index) => (
            <li key={`${step.operation_code}-${String(index)}`}>
              {operationDisplayName(step.operation_code)}
              {typeof step.parameters.column === "string"
                ? ` · ${step.parameters.column}`
                : ""}
            </li>
          ))}
        </ol>
        {message ? (
          <RecoveryMessage
            experience={mapRecoveryError(error, {
              operation: "save-cleanup",
              action: "Save cleanup",
            })}
            actions={
              <Button
                size="sm"
                variant="secondary"
                disabled={saving || name.trim().length === 0}
                onClick={() => {
                  onSave(name.trim(), description.trim());
                }}
              >
                Try saving again
              </Button>
            }
          />
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={saving || name.trim().length === 0}
            onClick={() => {
              onSave(name.trim(), description.trim());
            }}
          >
            {saving ? "Saving…" : "Save as cleanup"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
