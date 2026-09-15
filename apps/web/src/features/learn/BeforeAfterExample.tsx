import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { ExampleLabel } from "./ExampleLabel";

const ROWS = [
  { before: '" Alice "', after: "Alice", meaning: "Extra spaces removed" },
  { before: "ACTIVE", after: "active", meaning: "Capitalization made consistent" },
  { before: "(blank)", after: "540", meaning: "A missing value filled" },
  {
    before: "duplicate row",
    after: "removed",
    meaning: "An extra copy of a row dropped",
  },
] as const;

export function BeforeAfterExample() {
  const [side, setSide] = useState<"before" | "after">("before");
  return (
    <div className="rounded-[var(--facilio-radius-md)] border border-line bg-surface p-4">
      <ExampleLabel />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Before / after</p>
        <div className="flex gap-2" role="group" aria-label="Before or after">
          <Button
            size="sm"
            variant={side === "before" ? "primary" : "secondary"}
            aria-pressed={side === "before"}
            onClick={() => {
              setSide("before");
            }}
          >
            Before
          </Button>
          <Button
            size="sm"
            variant={side === "after" ? "primary" : "secondary"}
            aria-pressed={side === "after"}
            onClick={() => {
              setSide("after");
            }}
          >
            After
          </Button>
        </div>
      </div>
      <ul className="mt-4 space-y-2" aria-live="polite">
        {ROWS.map((row) => (
          <li
            key={row.meaning}
            className="flex flex-col gap-1 border-t border-line pt-2 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <span className="font-mono text-sm text-ink">
              {side === "before" ? row.before : row.after}
            </span>
            <span className="text-xs text-ink-muted">{row.meaning}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-6 text-ink-secondary">
        This is an example. In the product, FACILIO shows values calculated from the real
        preview — not this illustration.
      </p>
    </div>
  );
}
