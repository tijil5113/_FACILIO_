interface ProcessDiagramProps {
  label: string;
  steps: string[];
}

export function ProcessDiagram({ label, steps }: ProcessDiagramProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step}
          className="journey-step flex items-center gap-2"
          style={{ animationDelay: `${String(index * 70)}ms` }}
        >
          <span className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-3 py-2 text-sm text-ink">
            <span className="mr-2 text-xs text-ink-muted">{String(index + 1)}</span>
            {step}
          </span>
          {index < steps.length - 1 ? (
            <span className="text-ink-muted" aria-hidden="true">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
