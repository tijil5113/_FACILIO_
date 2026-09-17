import { Button } from "@/components/ui/Button";
import { DisabledHint } from "@/components/ui/DisabledHint";
import { VersionLabel } from "@/components/ui/VersionLabel";
import { fileFormatLabel } from "@/features/datasets/file-format";
import type { WorkspacePrimary } from "@/features/datasets/workspace-state";
import { formatCount } from "@/lib/format";
import { versionHeadline } from "@/lib/version-labels";
import type { DatasetDetail } from "@/types/dataset";
import type { DatasetVersion } from "@/types/transformations";

interface DatasetHeaderProps {
  dataset: DatasetDetail;
  versions: DatasetVersion[] | undefined;
  selectedVersion: DatasetVersion | undefined;
  selectedVersionId: string | undefined;
  viewingDifferent: boolean;
  usingVersion: DatasetVersion | undefined;
  analysisLabel: string;
  primary: WorkspacePrimary;
  analyzing: boolean;
  onVersionChange: (versionId: string) => void;
  onPrimary: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function DatasetHeader({
  dataset,
  versions,
  selectedVersion,
  selectedVersionId,
  viewingDifferent,
  usingVersion,
  analysisLabel,
  primary,
  analyzing,
  onVersionChange,
  onPrimary,
  onRename,
  onDelete,
}: DatasetHeaderProps) {
  const rowCount = selectedVersion?.row_count ?? dataset.row_count;
  const columnCount = selectedVersion?.column_count ?? dataset.column_count;
  const dimensions = [
    fileFormatLabel(dataset.file_type),
    rowCount != null ? `${formatCount(rowCount)} rows` : null,
    columnCount != null ? `${formatCount(columnCount)} columns` : null,
    analysisLabel,
  ].filter((item): item is string => Boolean(item));

  return (
    <header className="dataset-header space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {dataset.is_sample ? <p className="type-meta text-ink-muted">Sample</p> : null}
          <h1 className="type-page-title min-w-0 truncate text-ink" title={dataset.name}>
            {dataset.name}
          </h1>
          <p className="type-caption mt-2 text-ink-secondary">{dimensions.join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primary.kind !== "none" ? (
            <DisabledHint
              disabled={primary.kind === "analyze" && analyzing}
              reason={analyzing ? "Analysis is already running." : undefined}
            >
              <Button
                onClick={onPrimary}
                disabled={primary.kind === "analyze" && analyzing}
              >
                {primary.label}
              </Button>
            </DisabledHint>
          ) : null}
          <Button variant="ghost" onClick={onRename}>
            Rename
          </Button>
          <Button variant="ghost" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      {selectedVersion ? (
        <div className="space-y-2">
          {viewingDifferent && usingVersion ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="type-body text-ink">
                Viewing {versionHeadline(selectedVersion)}
              </p>
              <p className="type-caption text-ink-muted">
                Currently using {versionHeadline(usingVersion)}
              </p>
            </div>
          ) : (
            <VersionLabel version={selectedVersion} viewing />
          )}
          {versions && versions.length > 1 ? (
            <label className="block max-w-lg text-xs font-medium text-ink-secondary">
              Version
              <select
                className="facilio-control mt-1 w-full"
                value={selectedVersionId}
                onChange={(event) => {
                  onVersionChange(event.target.value);
                }}
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {versionHeadline(version)}
                    {version.is_current ? " · Using" : ""}
                    {version.id === selectedVersionId && !version.is_current
                      ? " · Viewing"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className="type-caption text-ink-muted">Your original is preserved.</p>
        </div>
      ) : null}
    </header>
  );
}
