import { useId, useRef, useState, type DragEvent, type SyntheticEvent } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatFileSize } from "@/lib/format";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import type { RecoveryExperience } from "@/features/recovery/types";
import { ApiClientError } from "@/types/api";
import type {
  DatasetDetail,
  SheetInfo,
  SheetSelectionDetails,
  UploadStage,
} from "@/types/dataset";

const ACCEPTED = [".csv", ".xlsx", ".json"];
const ACCEPTED_LABEL = "CSV, XLSX, and JSON";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSheetSelection(value: unknown): value is SheetSelectionDetails {
  if (!isRecord(value) || typeof value.staging_id !== "string") {
    return false;
  }
  return Array.isArray(value.sheets);
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  maxUploadSizeMb: number;
  onUploaded: (dataset: DatasetDetail) => void;
  upload: (form: FormData) => Promise<DatasetDetail>;
}

export function UploadDialog({
  open,
  onClose,
  maxUploadSizeMb,
  onUploaded,
  upload,
}: UploadDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [error, setError] = useState<RecoveryExperience | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[] | null>(null);
  const [stagingId, setStagingId] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string | null>(null);

  const maxBytes = maxUploadSizeMb * 1024 * 1024;
  const busy = stage === "preparing" || stage === "uploading" || stage === "processing";

  function reset() {
    setFile(null);
    setDragOver(false);
    setStage("idle");
    setError(null);
    setSheets(null);
    setStagingId(null);
    setSelectedSheet(null);
    setOriginalName(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleClose() {
    if (busy) {
      return;
    }
    reset();
    onClose();
  }

  function validateFile(next: File): RecoveryExperience | null {
    const name = next.name.toLowerCase();
    if (!ACCEPTED.some((ext) => name.endsWith(ext))) {
      return mapRecoveryError(
        new ApiClientError({
          message: `Supported formats are ${ACCEPTED_LABEL}.`,
          code: "UNSUPPORTED_FILE_TYPE",
          status: 415,
        }),
        { operation: "upload", action: "Upload file", maxUploadSizeMb },
      );
    }
    if (next.size === 0) {
      return mapRecoveryError(
        new ApiClientError({
          message: "The selected file is empty.",
          code: "EMPTY_FILE",
          status: 400,
        }),
        { operation: "upload", action: "Upload file", maxUploadSizeMb },
      );
    }
    if (next.size > maxBytes) {
      return mapRecoveryError(
        new ApiClientError({
          message: `The file exceeds the allowed limit of ${String(maxUploadSizeMb)} MB.`,
          code: "FILE_TOO_LARGE",
          status: 413,
        }),
        { operation: "upload", action: "Upload file", maxUploadSizeMb },
      );
    }
    return null;
  }

  function acceptFile(next: File) {
    const message = validateFile(next);
    setError(message);
    setSheets(null);
    setStagingId(null);
    setSelectedSheet(null);
    setStage("idle");
    setFile(message ? null : next);
    setOriginalName(next.name);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) {
      acceptFile(dropped);
    }
  }

  async function submitFile(target: File) {
    setStage("preparing");
    setError(null);
    const form = new FormData();
    form.append("file", target);
    setStage("uploading");
    await runUpload(form);
  }

  async function submitSheet(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stagingId || !selectedSheet) {
      setError(
        mapRecoveryError(
          new ApiClientError({
            message: "Select a worksheet to continue.",
            code: "INVALID_SHEET",
            status: 400,
          }),
          { operation: "upload", action: "Upload file", maxUploadSizeMb },
        ),
      );
      return;
    }
    const form = new FormData();
    form.append("staging_id", stagingId);
    form.append("sheet", selectedSheet);
    setStage("uploading");
    await runUpload(form);
  }

  async function runUpload(form: FormData) {
    setStage("processing");
    try {
      const dataset = await upload(form);
      setStage("success");
      onUploaded(dataset);
      reset();
      onClose();
    } catch (caught) {
      if (
        caught instanceof ApiClientError &&
        caught.code === "SHEET_SELECTION_REQUIRED"
      ) {
        if (isSheetSelection(caught.details)) {
          setSheets(caught.details.sheets);
          setStagingId(caught.details.staging_id);
          setOriginalName(caught.details.original_filename);
          setStage("idle");
          setError(null);
          return;
        }
      }
      setStage("failed");
      setError(
        mapRecoveryError(caught, {
          operation: "upload",
          action: "Upload file",
          maxUploadSizeMb,
        }),
      );
    }
  }

  return (
    <Dialog open={open} title="Upload a file" onClose={handleClose} className="max-w-xl">
      <div className="border-b border-line px-5 py-4">
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
          Upload
        </p>
        <h2 className="mt-1 text-base font-semibold text-ink">Upload a file</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          FACILIO stores your original file. Cleaning later creates a new version.
        </p>
      </div>
      <div className="space-y-4 px-5 py-4">
        {sheets ? (
          <form onSubmit={(event) => void submitSheet(event)} className="space-y-4">
            <p className="text-sm text-ink">
              Workbook detected
              {originalName ? (
                <span className="text-ink-secondary"> · {originalName}</span>
              ) : null}
            </p>
            <p className="text-sm text-ink-secondary">
              {String(sheets.filter((sheet) => !sheet.empty).length)} usable sheet
              {sheets.filter((sheet) => !sheet.empty).length === 1 ? "" : "s"} available.
              Select one to continue — the upload does not need to be restarted.
            </p>
            <fieldset>
              <legend className="sr-only">Worksheet</legend>
              <div className="space-y-1">
                {sheets.map((sheet) => {
                  const disabled = sheet.empty;
                  return (
                    <label
                      key={sheet.name}
                      className={`flex cursor-pointer items-start gap-3 rounded-[var(--facilio-radius-md)] border px-3 py-2 ${
                        selectedSheet === sheet.name
                          ? "border-accent bg-accent-soft"
                          : "border-line bg-raised"
                      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <input
                        type="radio"
                        name="sheet"
                        value={sheet.name}
                        disabled={disabled}
                        checked={selectedSheet === sheet.name}
                        onChange={() => {
                          setSelectedSheet(sheet.name);
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-ink">
                          {sheet.name}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {sheet.empty ? "Empty — not usable" : "Contains tabular data"}
                          {sheet.hidden ? " · Hidden" : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {error ? <RecoveryMessage experience={error} /> : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={handleClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !selectedSheet}>
                {busy ? "Processing" : "Ingest sheet"}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => {
                setDragOver(false);
              }}
              onDrop={onDrop}
              className={`rounded-[var(--facilio-radius-md)] border border-dashed px-4 py-8 text-center transition-colors duration-[var(--facilio-duration-fast)] ${
                dragOver ? "border-accent bg-accent-soft" : "border-line bg-subtle"
              }`}
            >
              <Upload
                className="mx-auto mb-3 text-ink-muted"
                size={20}
                aria-hidden="true"
              />
              <p className="text-sm text-ink">Drop a file here</p>
              <p className="mt-1 text-xs text-ink-muted">
                {ACCEPTED_LABEL} · up to {String(maxUploadSizeMb)} MB
              </p>
              <div className="mt-4">
                <input
                  ref={inputRef}
                  id={inputId}
                  type="file"
                  accept={ACCEPTED.join(",")}
                  className="sr-only"
                  aria-label="Choose a dataset file"
                  onChange={(event) => {
                    const next = event.target.files?.[0];
                    if (next) {
                      acceptFile(next);
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    inputRef.current?.click();
                  }}
                >
                  Browse files
                </Button>
              </div>
            </div>
            {file ? (
              <div className="flex items-center gap-3 rounded-[var(--facilio-radius-md)] border border-line bg-raised px-3 py-2">
                <FileSpreadsheet
                  size={16}
                  className="text-ink-muted"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm text-ink">{file.name}</p>
                  <p className="text-xs text-ink-muted">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ) : null}
            {stage !== "idle" && stage !== "failed" && stage !== "success" ? (
              <p className="text-sm text-ink-secondary" role="status" aria-live="polite">
                {stageLabel(stage)}
              </p>
            ) : null}
            {error ? (
              <RecoveryMessage
                experience={error}
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      inputRef.current?.click();
                    }}
                  >
                    Choose another file
                  </Button>
                }
              />
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                disabled={!file || busy}
                onClick={() => {
                  if (file) {
                    void submitFile(file);
                  }
                }}
              >
                {busy ? "Processing" : "Upload"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

function stageLabel(stage: UploadStage): string {
  if (stage === "preparing") {
    return "Preparing";
  }
  if (stage === "uploading") {
    return "Uploading";
  }
  if (stage === "processing") {
    return "Processing";
  }
  return "";
}
