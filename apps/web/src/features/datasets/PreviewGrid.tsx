import { Tooltip } from "@/components/ui/Tooltip";
import type { ColumnDtype, DatasetPreview } from "@/types/dataset";

interface PreviewGridProps {
  preview: DatasetPreview;
}

export function PreviewGrid({ preview }: PreviewGridProps) {
  if (preview.column_count === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        This dataset has no columns to preview.
      </p>
    );
  }
  if (preview.row_count === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        This dataset has a header but no data rows. Source values were not altered.
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
      <div className="max-h-[28rem] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">
            Dataset preview. Missing values are shown as blank.
          </caption>
          <thead className="sticky top-0 z-10 bg-subtle">
            <tr>
              <th className="sticky left-0 z-20 border-b border-line bg-subtle px-2 py-2 font-mono text-[11px] text-ink-muted">
                #
              </th>
              {preview.columns.map((column) => (
                <th
                  key={`${String(column.index)}-${column.name}`}
                  className="border-b border-line px-3 py-2 font-medium whitespace-nowrap text-ink"
                >
                  <span className="block max-w-[14rem] truncate">
                    {column.name || "(blank)"}
                  </span>
                  <span className="font-mono text-[10px] tracking-wide text-ink-muted uppercase">
                    {column.dtype}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-surface even:bg-raised">
                <td className="sticky left-0 border-b border-line bg-inherit px-2 py-1.5 font-mono text-[11px] text-ink-muted">
                  {rowIndex + 1}
                </td>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`max-w-[16rem] border-b border-line px-3 py-1.5 whitespace-nowrap ${
                      preview.columns[cellIndex]?.dtype === "integer" ||
                      preview.columns[cellIndex]?.dtype === "decimal"
                        ? "text-right tabular-nums"
                        : ""
                    }`}
                  >
                    <PreviewCell
                      value={cell}
                      dtype={preview.columns[cellIndex]?.dtype ?? "unknown"}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(preview.truncated_rows || preview.truncated_columns) && (
        <p className="border-t border-line px-3 py-2 text-xs text-ink-muted">
          Preview is bounded
          {preview.truncated_rows ? " · additional rows omitted" : ""}
          {preview.truncated_columns ? " · additional columns omitted" : ""}.
        </p>
      )}
    </div>
  );
}

function PreviewCell({ value, dtype }: { value: unknown; dtype: ColumnDtype }) {
  if (value === null || value === undefined) {
    return (
      <span
        className="font-mono text-[11px] tracking-wide text-ink-muted"
        title="Missing value"
      >
        (blank)
      </span>
    );
  }
  const text = formatCell(value, dtype);
  const truncated = text.length > 48;
  const display = truncated ? `${text.slice(0, 48)}…` : text;
  if (truncated) {
    return (
      <Tooltip label={text} side="bottom">
        <span className="block truncate text-ink">{display}</span>
      </Tooltip>
    );
  }
  return <span className="text-ink">{display}</span>;
}

function formatCell(value: unknown, dtype: ColumnDtype): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return dtype === "integer" ? String(value) : String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}
