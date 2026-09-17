import { ExampleLabel } from "./ExampleLabel";

const LINEAR = ["V1 Original", "V2 Cleaned", "V3 Cleaned"] as const;

export function LineageDiagram() {
  return (
    <figure className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-4">
      <ExampleLabel kind="Illustration" />
      <figcaption className="text-sm font-medium text-ink">Version lineage</figcaption>
      <p className="sr-only">
        V1 Original leads to V2 Cleaned, which leads to V3 Cleaned. Each cleaned version
        is a new snapshot. The original remains available.
      </p>
      <ol className="mt-4 space-y-2" aria-hidden="true">
        {LINEAR.map((label, index) => (
          <li key={label} className="flex flex-col items-start gap-2">
            <span className="rounded-[var(--facilio-radius-md)] border border-line bg-subtle px-3 py-2 font-mono text-sm text-ink">
              {label}
            </span>
            {index < LINEAR.length - 1 ? (
              <span className="px-3 text-ink-muted" aria-hidden="true">
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
