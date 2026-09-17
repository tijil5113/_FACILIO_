import { Link } from "react-router";

import { Button } from "@/components/ui/Button";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { VersionLabel } from "@/components/ui/VersionLabel";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useDatasetVersionsQuery,
  useSetCurrentVersionMutation,
  useVersionComparisonQuery,
} from "@/features/datasets/queries";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { formatCount, formatDateTime, formatScore } from "@/lib/format";
import { versionHeadline } from "@/lib/version-labels";
import { useUiStore } from "@/stores/ui-store";
import type { DatasetVersion, QualityDelta } from "@/types/transformations";

interface HistoryPanelProps {
  datasetId: string;
  versionId: string;
  onSelectVersion: (versionId: string) => void;
}

export function HistoryPanel({
  datasetId,
  versionId,
  onSelectVersion,
}: HistoryPanelProps) {
  const versionsQuery = useDatasetVersionsQuery(datasetId);
  const selected = versionsQuery.data?.find((item) => item.id === versionId);
  const comparisonQuery = useVersionComparisonQuery(
    datasetId,
    versionId,
    selected?.kind === "DERIVED",
  );
  const restore = useSetCurrentVersionMutation(datasetId);

  if (versionsQuery.isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading history">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mt-2 h-16 w-full" />
      </div>
    );
  }
  if (versionsQuery.isError) {
    return (
      <Callout tone="danger" title="History unavailable">
        History could not be loaded. Your versions were not changed.
      </Callout>
    );
  }
  const versions = [...(versionsQuery.data ?? [])].sort(
    (left, right) => left.version_number - right.version_number,
  );
  if (versions.length === 0) {
    return <p className="type-body text-ink-muted">No versions recorded yet.</p>;
  }
  const roots = versions.filter((item) => item.parent_version_id === null);
  const branched = versions.some((item) => {
    const siblings = versions.filter(
      (other) =>
        other.parent_version_id && other.parent_version_id === item.parent_version_id,
    );
    return siblings.length > 1;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="type-section text-ink">History</h2>
        <p className="type-body-sm mt-1 max-w-2xl text-ink-secondary">
          FACILIO keeps each change as a version. Using an older version does not delete
          later ones.
        </p>
        <p className="mt-2">
          <LearnMoreLink to="/learn#versions">
            How versions protect your original
          </LearnMoreLink>
        </p>
      </div>
      <ol className="lineage-list" aria-label="Version lineage">
        {roots.map((root) => (
          <VersionBranch
            key={root.id}
            version={root}
            versions={versions}
            selectedId={versionId}
            branched={branched}
            onSelectVersion={onSelectVersion}
            onUseVersion={(id) => {
              restore.mutate(id, {
                onSuccess: () => {
                  useUiStore
                    .getState()
                    .showNotice("Using this version. Later versions are kept.");
                },
              });
            }}
            usingPending={restore.isPending}
          />
        ))}
      </ol>
      {selected?.kind === "DERIVED" && comparisonQuery.isError ? (
        <p className="type-caption text-ink-muted">
          Comparison with the previous version is unavailable for this view.
        </p>
      ) : null}
      {comparisonQuery.data && !comparisonQuery.isError ? (
        <ComparisonBlock comparison={comparisonQuery.data} />
      ) : selected?.kind === "ORIGINAL" ? (
        <p className="type-caption text-ink-muted">
          V1 Original has no previous version to compare.
        </p>
      ) : null}
    </div>
  );
}

function VersionBranch({
  version,
  versions,
  selectedId,
  branched,
  onSelectVersion,
  onUseVersion,
  usingPending,
}: {
  version: DatasetVersion;
  versions: DatasetVersion[];
  selectedId: string;
  branched: boolean;
  onSelectVersion: (versionId: string) => void;
  onUseVersion: (versionId: string) => void;
  usingPending: boolean;
}) {
  const children = versions.filter((item) => item.parent_version_id === version.id);
  const parent = versions.find((item) => item.id === version.parent_version_id);
  const selected = version.id === selectedId;
  const createdHow =
    version.created_by_workflow_run_id && version.workflow_name
      ? `Created by cleanup ${version.workflow_name}${
          version.workflow_revision != null
            ? ` · revision ${String(version.workflow_revision)}`
            : ""
        }`
      : (version.operation_summary ??
        (version.kind === "ORIGINAL" ? "Uploaded" : version.label));

  return (
    <li className="lineage-item">
      <article
        className={`rounded-[var(--facilio-radius-md)] border px-4 py-3 ${
          selected ? "border-ink bg-subtle" : "border-line bg-surface"
        }`}
      >
        <button
          type="button"
          className="w-full text-left"
          onClick={() => {
            onSelectVersion(version.id);
          }}
        >
          <VersionLabel version={version} viewing={selected} />
          <p className="type-body-sm mt-1 text-ink-secondary">{createdHow}</p>
          {parent ? (
            <p className="type-caption mt-1 text-ink-muted">
              Created from {versionHeadline(parent)}
              {children.length > 1 || branched ? " · this version has siblings" : ""}
            </p>
          ) : (
            <p className="type-caption mt-1 text-ink-muted">
              Source-derived original version
            </p>
          )}
          <p className="type-caption mt-1 text-ink-muted">
            {formatCount(version.row_count)} rows
            {version.column_count != null
              ? ` · ${formatCount(version.column_count)} columns`
              : ""}
            {" · "}
            {formatDateTime(version.created_at)}
          </p>
        </button>
        <div className="mt-3 flex flex-wrap gap-2">
          {selected ? null : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onSelectVersion(version.id);
              }}
            >
              View
            </Button>
          )}
          {version.is_current ? (
            <p className="type-caption self-center text-ink-muted">Currently using</p>
          ) : (
            <Button
              size="sm"
              variant={selected ? "primary" : "secondary"}
              disabled={usingPending}
              onClick={() => {
                onUseVersion(version.id);
              }}
            >
              Use this version
            </Button>
          )}
        </div>
        {selected && !version.is_current ? (
          <p className="type-caption mt-2 text-ink-muted">
            This makes {versionHeadline(version)} the version FACILIO uses for future
            work. Other versions remain available.
          </p>
        ) : null}
        <TechnicalDetails>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="type-meta text-ink-muted">Version ID</dt>
              <dd className="type-mono mt-1 break-all text-ink">{version.id}</dd>
            </div>
            <div>
              <dt className="type-meta text-ink-muted">Parent version</dt>
              <dd className="type-mono mt-1 break-all text-ink">
                {version.parent_version_id ?? "None"}
              </dd>
            </div>
            {version.operation_code ? (
              <div>
                <dt className="type-meta text-ink-muted">Operation</dt>
                <dd className="type-mono mt-1 text-ink">{version.operation_code}</dd>
              </div>
            ) : null}
            <div>
              <dt className="type-meta text-ink-muted">Profile</dt>
              <dd className="type-mono mt-1 text-ink">{version.profile_status}</dd>
            </div>
          </dl>
          {version.created_by_workflow_run_id ? (
            <Link
              to={`/runs/${version.created_by_workflow_run_id}`}
              className="mt-2 inline-block text-xs text-accent hover:underline"
            >
              View originating run record
            </Link>
          ) : null}
        </TechnicalDetails>
      </article>
      {children.length > 0 ? (
        <ol
          className="lineage-children"
          aria-label={`Versions created from ${versionHeadline(version)}`}
        >
          {children.map((child) => (
            <VersionBranch
              key={child.id}
              version={child}
              versions={versions}
              selectedId={selectedId}
              branched={branched || children.length > 1}
              onSelectVersion={onSelectVersion}
              onUseVersion={onUseVersion}
              usingPending={usingPending}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function ComparisonBlock({
  comparison,
}: {
  comparison: {
    parent: DatasetVersion;
    child: DatasetVersion;
    impact: {
      rows_before: number;
      rows_after: number;
      columns_before: number;
      columns_after: number;
    } | null;
    transformation: { summary: string } | null;
    quality_delta: QualityDelta | null;
  };
}) {
  return (
    <section aria-label="Compare with previous version" className="space-y-3">
      <h3 className="type-section text-ink">Compare versions</h3>
      <p className="type-body-sm text-ink-secondary">
        <span className="text-ink">{versionHeadline(comparison.parent)}</span>
        {" → "}
        <span className="text-ink">{versionHeadline(comparison.child)}</span>
        {comparison.transformation?.summary
          ? ` · ${comparison.transformation.summary}`
          : ""}
      </p>
      {comparison.impact ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="type-meta text-ink-muted">Rows</dt>
            <dd className="type-data mt-1 text-ink">
              {formatCount(comparison.impact.rows_before)} →{" "}
              {formatCount(comparison.impact.rows_after)}
            </dd>
          </div>
          <div>
            <dt className="type-meta text-ink-muted">Columns</dt>
            <dd className="type-data mt-1 text-ink">
              {formatCount(comparison.impact.columns_before)} →{" "}
              {formatCount(comparison.impact.columns_after)}
            </dd>
          </div>
        </dl>
      ) : null}
      <QualityDeltaBlock delta={comparison.quality_delta} />
    </section>
  );
}

export function QualityDeltaBlock({
  delta,
}: {
  delta: {
    before: number | null;
    after: number | null;
    delta: number | null;
    dimensions?: Array<{
      key: string;
      label: string;
      before: number | null;
      after: number | null;
    }>;
  } | null;
}) {
  if (!delta || (delta.before == null && delta.after == null)) {
    return (
      <p className="type-caption text-ink-muted">
        Quality comparison is available after both versions are analyzed.
      </p>
    );
  }
  return (
    <div>
      <p className="type-meta text-ink-muted">Quality</p>
      <p className="type-data mt-1 text-ink">
        {formatScore(delta.before)} → {formatScore(delta.after)}
      </p>
      <p className="type-caption mt-2 text-ink-muted">
        Quality is evidence-based, not a guarantee of business correctness. A cleanup may
        raise, lower, or leave the score unchanged.
      </p>
      {delta.dimensions && delta.dimensions.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {delta.dimensions.map((dimension) => (
            <li key={dimension.key} className="type-caption text-ink-secondary">
              {dimension.label}: {formatScore(dimension.before)} →{" "}
              {formatScore(dimension.after)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
