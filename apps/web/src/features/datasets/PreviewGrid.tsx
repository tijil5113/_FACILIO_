import { Tooltip } from "@/components/ui/Tooltip";
import {
  columnTypeLabel,
  dtypeLabel,
  isNumericDtype,
} from "@/features/datasets/dtype-labels";
import { formatCount } from "@/lib/format";
import type { ColumnDtype, DatasetPreview } from "@/types/dataset";

interface PreviewGridProps {
  preview: DatasetPreview;
  totalRows?: number | null;
  totalColumns?: number | null;
  detectedTypes?: Record<string, string>;
}

export function PreviewGrid({
  preview,
  totalRows,
  totalColumns,
  detectedTypes,
}: PreviewGridProps) {
  if (preview.column_count === 0) {
    return (
      <p className="type-body text-ink-secondary">
        This version has no columns to preview.
      </p>
    );
  }
  if (preview.row_count === 0) {
    return (
      <p className="type-body text-ink-secondary">
        This version has a header but no data rows. Source values were not altered.
      </p>
    );
  }

  const rowTotal = totalRows ?? preview.row_count;
  const columnTotal = totalColumns ?? preview.column_count;
  const showingRows = preview.preview_row_count || preview.rows.length;
  const bounded = preview.truncated_rows || preview.truncated_columns;
  const wide = preview.columns.length > 8 || preview.truncated_columns;

  return (
    <div className="space-y-2">
      <p className="type-caption text-ink-muted" role="status">
        {bounded
          ? `Preview of ${formatCount(showingRows)} of ${formatCount(rowTotal)} rows`
          : `Showing all ${formatCount(rowTotal)} rows`}
        {preview.truncated_columns
          ? ` · ${formatCount(preview.columns.length)} of ${formatCount(columnTotal)} columns shown`
          : ` · ${formatCount(columnTotal)} columns`}
        {wide ? " · Scroll sideways to see more columns" : ""}.
      </p>
      <div className="preview-table-wrap">
        <table className="preview-table">
          <caption className="sr-only">
            Dataset preview. Missing cells are labeled Missing. Empty strings are labeled
            Blank. Zero and false are data values.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="preview-row-head">
                <span className="sr-only">Preview row</span>
                <span aria-hidden="true">#</span>
              </th>
              {preview.columns.map((column) => (
                <th
                  key={`${String(column.index)}-${column.name}`}
                  scope="col"
                  className="preview-col-head"
                >
                  <span
                    className="block max-w-[14rem] truncate"
                    title={column.name || "(blank)"}
                  >
                    {column.name || "(blank)"}
                  </span>
                  <span className="type-caption font-normal tracking-normal text-ink-muted normal-case">
                    {detectedTypes?.[column.name]
                      ? columnTypeLabel(detectedTypes[column.name] ?? "")
                      : dtypeLabel(column.dtype)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th scope="row" className="preview-row-num">
                  {rowIndex + 1}
                </th>
                {row.map((cell, cellIndex) => {
                  const dtype = preview.columns[cellIndex]?.dtype ?? "unknown";
                  return (
                    <td
                      key={cellIndex}
                      className={
                        isNumericDtype(dtype) ? "text-right tabular-nums" : undefined
                      }
                    >
                      <PreviewCell value={cell} dtype={dtype} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewCell({ value, dtype }: { value: unknown; dtype: ColumnDtype }) {
  if (value === null || value === undefined) {
    return (
      <span className="preview-cell-missing" title="Missing value">
        Missing
      </span>
    );
  }
  if (value === "") {
    return (
      <span className="preview-cell-blank" title="Blank value">
        Blank
      </span>
    );
  }
  const text = formatCell(value, dtype);
  const truncated = text.length > 48;
  const display = truncated ? `${text.slice(0, 48)}…` : text;
  if (truncated) {
    return (
      <Tooltip label={text} side="bottom">
        <span className="block max-w-[16rem] truncate text-ink">{display}</span>
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
