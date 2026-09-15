import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ApiClientError } from "@/types/api";
import { useState } from "react";

interface DeleteDialogProps {
  open: boolean;
  datasetName: string;
  originalFilename: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteDialog({
  open,
  datasetName,
  originalFilename,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function confirm() {
    setWorking(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : "The dataset could not be deleted.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} title="Delete dataset" onClose={onClose}>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-ink">Delete “{datasetName}”?</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          This removes the dataset and its FACILIO-managed versions from this workspace,
          including the original file ({originalFilename}). This action cannot be undone.
        </p>
      </div>
      <div className="space-y-4 px-5 py-4">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={working}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={working}
            onClick={() => {
              void confirm();
            }}
          >
            {working ? "Deleting" : "Delete dataset"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
