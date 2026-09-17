import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { humanStepFromWorkflow } from "@/features/workflows/step-language";
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const message = error != null;

  return (
    <Dialog open={open} title="Save as Cleanup" onClose={onClose}>
      <div className="space-y-4 px-5 py-5">
        <div>
          <h2 className="type-card-title text-ink">Save as Cleanup</h2>
          <p className="type-body mt-1 text-ink-secondary">
            You're saving the cleaning steps you just used. You can run them again later.
            Your cleaned version is already safe.
          </p>
        </div>
        <Input
          id="cleanup-name"
          label="Name"
          value={name}
          required
          maxLength={200}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <Textarea
          id="cleanup-description"
          label="Description"
          value={description}
          maxLength={4000}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
        />
        <div>
          <h3 className="type-meta text-ink-muted">Cleaning steps</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-secondary">
            {steps.map((step, index) => (
              <li key={`${step.operation_code}-${String(index)}`}>
                {humanStepFromWorkflow(step)}
              </li>
            ))}
          </ol>
        </div>
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
            {saving ? "Saving…" : "Save Cleanup"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
