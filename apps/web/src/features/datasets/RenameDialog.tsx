import { useId, useState, type SyntheticEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { ApiClientError } from "@/types/api";

interface RenameDialogProps {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
}

export function RenameDialog({
  open,
  currentName,
  onClose,
  onRename,
}: RenameDialogProps) {
  const fieldId = useId();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a dataset name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onRename(trimmed);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : "The dataset could not be renamed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} title="Rename dataset" onClose={onClose}>
      <form onSubmit={(event) => void onSubmit(event)}>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Rename dataset</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            This changes the workspace name. The uploaded source file is not modified.
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <Input
            id={fieldId}
            label="Name"
            value={name}
            maxLength={200}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          {error ? (
            <Callout tone="danger" title="Rename failed">
              {error}
            </Callout>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
