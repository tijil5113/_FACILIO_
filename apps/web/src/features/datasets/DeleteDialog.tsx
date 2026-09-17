import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/Dialog";
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
    <Dialog open={open} title={`Delete “${datasetName}”?`} size="sm" onClose={onClose}>
      <DialogHeader
        title={`Delete “${datasetName}”?`}
        description={`This removes the dataset and its FACILIO-managed versions from this workspace, including the original file (${originalFilename}). This action cannot be undone.`}
      />
      <DialogBody>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={working}>
          Cancel
        </Button>
        <Button
          variant="danger"
          loading={working}
          onClick={() => {
            void confirm();
          }}
        >
          {working ? "Deleting" : "Delete dataset"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
