import { ExampleLabel } from "./ExampleLabel";

const STEPS = [
  { from: '" Alice "', action: "Trim extra spaces", to: "Alice" },
  { from: "Alice", action: "Make lowercase", to: "alice" },
] as const;

export function ComposedPreviewExample() {
  return (
    <figure className="rounded-[var(--facilio-radius-md)] border border-line bg-surface p-4">
      <ExampleLabel />
      <figcaption className="text-sm font-medium text-ink">
        Why step order matters
      </figcaption>
      <p className="sr-only">
        Educational example. Trim extra spaces turns quote Alice quote with spaces into
        Alice. Making it lowercase then produces alice. Preview shows that combined final
        result, not each intermediate save.
      </p>
      <ol className="mt-4 space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.action} className="space-y-1">
            <p className="font-mono text-sm text-ink">{step.from}</p>
            <p className="text-xs text-ink-muted">
              {index + 1}. {step.action}
              <span aria-hidden="true"> → </span>
              <span className="font-mono text-ink">{step.to}</span>
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-6 text-ink-secondary">
        Preview shows the combined final result:{" "}
        <span className="font-mono text-ink">alice</span>. FACILIO does not write a
        version for the in-between trim.
      </p>
    </figure>
  );
}
