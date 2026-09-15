import { useMemo, useState } from "react";

import { formatPercent } from "@/lib/format";
import type { ColumnProfile } from "@/types/profile";

interface MissingnessChartProps {
  columns: ColumnProfile[];
}

type SortKey = "name" | "missing";

export function MissingnessChart({ columns }: MissingnessChartProps) {
  const [sort, setSort] = useState<SortKey>("missing");
  const ranked = useMemo(() => {
    const copy = [...columns];
    copy.sort((left, right) => {
      if (sort === "name") {
        return left.name.localeCompare(right.name);
      }
      return (right.null_percentage ?? 0) - (left.null_percentage ?? 0);
    });
    return copy;
  }, [columns, sort]);

  return (
    <section aria-label="Missingness by column">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">Missingness by column</h3>
        <label className="text-xs text-ink-secondary">
          Sort
          <select
            className="ml-2 rounded-[var(--facilio-radius-sm)] border border-line bg-raised px-2 py-1 text-xs text-ink"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
            }}
          >
            <option value="missing">Missing %</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <ul className="space-y-2">
        {ranked.map((column) => {
          const pct = column.null_percentage ?? 0;
          return (
            <li
              key={column.position}
              className="grid grid-cols-[minmax(0,1fr)_4rem] gap-3"
            >
              <div>
                <p className="truncate text-sm text-ink">{column.name || "(blank)"}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full bg-ink/70"
                    style={{ width: `${String(Math.min(100, pct))}%` }}
                  />
                </div>
              </div>
              <p className="self-end text-right font-mono text-xs tabular-nums text-ink-secondary">
                {formatPercent(column.null_percentage)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
