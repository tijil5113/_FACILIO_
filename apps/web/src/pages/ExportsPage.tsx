import { EmptyState } from "@/components/ui/EmptyState";

const formats = ["CSV", "XLSX", "JSON"] as const;

export function ExportsPage() {
  return (
    <EmptyState
      upcoming
      title="Exports"
      summary="Downloading cleaned files is not available in this version of FACILIO."
      detail="This page is a placeholder. It is not a working export product. Use History to keep working with versions inside FACILIO."
      visual={
        <div>
          <p className="mb-3 text-xs font-medium text-ink-secondary">Not available yet</p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {formats.map((format) => (
              <li
                key={format}
                className="rounded-[var(--facilio-radius-md)] border border-dashed border-line-strong bg-subtle px-4 py-6 text-center"
              >
                <p className="font-mono text-sm tracking-[0.12em] text-ink">{format}</p>
                <p className="mt-1 text-xs text-ink-muted">Not generated</p>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  );
}
