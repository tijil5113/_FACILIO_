import { ExampleLabel } from "./ExampleLabel";

interface ExampleTableProps {
  caption: string;
  columns: string[];
  rows: string[][];
}

export function ExampleTable({ caption, columns, rows }: ExampleTableProps) {
  return (
    <figure className="overflow-x-auto rounded-[var(--facilio-radius-md)] border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <ExampleLabel />
        <figcaption className="text-sm text-ink-secondary">{caption}</figcaption>
      </div>
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.join("-")}-${String(index)}`}
              className="border-t border-line"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`${columns[cellIndex] ?? "col"}-${String(cellIndex)}`}
                  className="px-4 py-2 font-mono text-ink"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
