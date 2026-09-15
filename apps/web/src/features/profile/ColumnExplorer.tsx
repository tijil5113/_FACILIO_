import { useEffect, useId, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { formatCount, formatPercent } from "@/lib/format";
import type { ColumnProfile, TopValue } from "@/types/profile";

interface ColumnExplorerProps {
  columns: ColumnProfile[];
}

export function ColumnExplorer({ columns }: ColumnExplorerProps) {
  const [selected, setSelected] = useState<number | null>(columns[0]?.position ?? null);
  const panelId = useId();
  const active = columns.find((column) => column.position === selected) ?? null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Column profiles</caption>
            <thead className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Completeness</th>
                <th className="px-4 py-2 font-medium">Distinct</th>
                <th className="px-4 py-2 font-medium">Cardinality</th>
                <th className="px-4 py-2 font-medium">Issues</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column) => {
                const isActive = column.position === selected;
                const complete =
                  column.null_percentage === null ? null : 100 - column.null_percentage;
                return (
                  <tr
                    key={column.position}
                    tabIndex={0}
                    aria-selected={isActive}
                    aria-controls={panelId}
                    className={`cursor-pointer border-t border-line ${
                      isActive ? "bg-subtle" : "hover:bg-subtle"
                    }`}
                    onClick={() => {
                      setSelected(column.position);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(column.position);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {column.name || "(blank)"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs uppercase text-ink-secondary">
                      {column.detected_type}
                      {column.semantic_hint ? (
                        <span className="ml-2 font-sans normal-case text-ink-muted">
                          {column.semantic_hint.toLowerCase()}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {formatPercent(complete)}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {formatCount(column.distinct_count)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{column.cardinality}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {formatCount(column.issue_count ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <aside
        id={panelId}
        className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-4"
        aria-live="polite"
      >
        {active ? (
          <ColumnDetail column={active} />
        ) : (
          <p className="text-sm text-ink-muted">
            Select a column to inspect its profile.
          </p>
        )}
      </aside>
    </div>
  );
}

function ColumnDetail({ column }: { column: ColumnProfile }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
          Column
        </p>
        <h3 className="mt-1 text-sm font-medium text-ink">{column.name || "(blank)"}</h3>
        <p className="mt-1 font-mono text-xs uppercase text-ink-secondary">
          {column.detected_type}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Rows" value={formatCount(column.row_count)} />
        <Stat label="Missing" value={formatCount(column.null_count)} />
        <Stat label="Distinct" value={formatCount(column.distinct_count)} />
        <Stat label="Cardinality" value={column.cardinality} />
      </dl>
      {column.text ? (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat
              label="Length"
              value={`${String(column.text.min_length ?? "—")}–${String(column.text.max_length ?? "—")}`}
            />
            <Stat
              label="Empty strings"
              value={formatCount(column.text.empty_string_count)}
            />
          </dl>
          <TopValues values={column.text.top_values} />
        </>
      ) : null}
      {column.numeric ? <NumericBlock stats={column.numeric} /> : null}
      {column.boolean ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="True" value={formatCount(column.boolean.true_count)} />
          <Stat label="False" value={formatCount(column.boolean.false_count)} />
          <Stat label="Missing" value={formatCount(column.boolean.missing_count)} />
        </dl>
      ) : null}
      {column.date ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Earliest" value={column.date.minimum ?? "—"} />
          <Stat label="Latest" value={column.date.maximum ?? "—"} />
          <Stat label="Distinct" value={formatCount(column.date.distinct_count)} />
        </dl>
      ) : null}
      {column.observations.length > 0 ? (
        <div>
          <p className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
            Observations
          </p>
          <ul className="mt-2 space-y-1 text-xs text-ink-secondary">
            {column.observations.map((item) => (
              <li key={item}>{item.replaceAll("_", " ").toLowerCase()}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function NumericBlock({ stats }: { stats: NonNullable<ColumnProfile["numeric"]> }) {
  const min = stats.minimum ?? 0;
  const max = stats.maximum ?? 0;
  const span = max - min || 1;
  const q1 = stats.percentile_25;
  const q3 = stats.percentile_75;
  const median = stats.median;
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Min" value={formatNumber(stats.minimum)} />
        <Stat label="Max" value={formatNumber(stats.maximum)} />
        <Stat label="Mean" value={formatNumber(stats.mean)} />
        <Stat label="Median" value={formatNumber(stats.median)} />
        <Stat label="Std dev" value={formatNumber(stats.stddev)} />
        <Stat label="Quartiles" value={`${formatNumber(q1)} / ${formatNumber(q3)}`} />
      </dl>
      {q1 !== null && q3 !== null && median !== null ? (
        <div>
          <p className="sr-only">
            Interquartile range from {formatNumber(q1)} to {formatNumber(q3)}, median{" "}
            {formatNumber(median)}.
          </p>
          <div className="relative h-2 rounded-full bg-subtle" aria-hidden="true">
            <div
              className="absolute top-0 h-2 bg-ink/30"
              style={{
                left: `${String(((q1 - min) / span) * 100)}%`,
                width: `${String(((q3 - q1) / span) * 100)}%`,
              }}
            />
            <div
              className="absolute top-[-2px] h-3 w-0.5 bg-ink"
              style={{ left: `${String(((median - min) / span) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TopValues({ values }: { values: TopValue[] }) {
  if (!values.length) {
    return null;
  }
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
        Top values
      </p>
      <ul className="mt-2 space-y-1">
        {values.map((item) => (
          <li
            key={item.value}
            className="flex items-center justify-between gap-2 font-mono text-xs text-ink"
          >
            <span className="truncate">{item.value || "(empty)"}</span>
            <span className="shrink-0 tabular-nums text-ink-secondary">
              {formatCount(item.count)} · {formatPercent(item.percentage)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
