import { useState } from "react";

import { cn } from "@/lib/cn";

import { ExampleLabel } from "./ExampleLabel";

const LINEAR = [
  {
    id: "v1",
    title: "V1 — Original",
    body: "The uploaded file. FACILIO does not overwrite it.",
  },
  {
    id: "v2",
    title: "V2 — Cleaned version",
    body: "Created after you approve a cleanup. You can inspect both.",
  },
] as const;

function VersionNode({
  item,
  selected,
  onSelect,
}: {
  item: (typeof LINEAR)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-[var(--facilio-radius-md)] border px-3 py-2 text-left text-sm transition-colors duration-[var(--facilio-duration-fast)]",
        selected
          ? "border-ink bg-subtle text-ink"
          : "border-line bg-surface text-ink-secondary hover:bg-subtle",
      )}
      onClick={onSelect}
    >
      {item.title}
    </button>
  );
}

export function VersionDiagram() {
  const [selected, setSelected] = useState<(typeof LINEAR)[number]["id"]>("v1");
  const original = LINEAR[0];
  const cleaned = LINEAR[1];
  const current = LINEAR.find((item) => item.id === selected);
  if (!current) {
    return null;
  }

  return (
    <div className="space-y-3">
      <ExampleLabel kind="Illustration" />
      <ol
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        aria-label="Original to cleaned version"
      >
        <li>
          <VersionNode
            item={original}
            selected={selected === "v1"}
            onSelect={() => {
              setSelected("v1");
            }}
          />
        </li>
        <li className="text-ink-muted" aria-hidden="true">
          ↓
        </li>
        <li>
          <span className="inline-block rounded-[var(--facilio-radius-md)] border border-dashed border-line px-3 py-2 text-sm text-ink-secondary">
            Clean data
          </span>
        </li>
        <li className="text-ink-muted" aria-hidden="true">
          ↓
        </li>
        <li>
          <VersionNode
            item={cleaned}
            selected={selected === "v2"}
            onSelect={() => {
              setSelected("v2");
            }}
          />
        </li>
      </ol>
      <p className="text-sm leading-6 text-ink-secondary">{current.body}</p>
    </div>
  );
}

export function BranchingIllustration() {
  return (
    <div className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3">
      <ExampleLabel kind="Illustration" />
      <p className="text-sm text-ink-secondary">
        You can create a new version from an older version.
      </p>
      <ul
        className="mt-3 space-y-2 font-mono text-sm text-ink"
        aria-label="Branching versions"
      >
        <li>V1 — Original</li>
        <li className="pl-4">├── V2 — Cleaned version</li>
        <li className="pl-4">└── V3 — Cleaned version</li>
      </ul>
    </div>
  );
}
