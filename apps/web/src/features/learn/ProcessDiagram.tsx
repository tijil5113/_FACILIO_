interface ProcessDiagramProps {
  label: string;
  steps: string[];
}

export function ProcessDiagram({ label, steps }: ProcessDiagramProps) {
  return (
    <figure className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-4">
      <ol className="space-y-0" aria-label={label}>
        {steps.map((step, index) => (
          <li key={step} className="flex flex-col">
            <div className="flex items-center gap-3">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[11px] text-ink-muted"
                aria-hidden="true"
              >
                {String(index + 1)}
              </span>
              <span className="text-sm text-ink">{step}</span>
            </div>
            {index < steps.length - 1 ? (
              <span className="ml-3.5 h-4 w-px bg-line" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
