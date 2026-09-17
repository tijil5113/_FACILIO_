import { useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

const DIMENSIONS = [
  {
    key: "completeness",
    label: "Completeness",
    question: "Are expected values present?",
    detail:
      "FACILIO checks where values are missing (empty cells it can measure as null). A blank may reduce completeness. An empty string is still a present value.",
  },
  {
    key: "uniqueness",
    label: "Uniqueness",
    question: "Are whole rows duplicated where FACILIO can measure that?",
    detail:
      "FACILIO compares full records. Repeated categories in one column, such as many “active” statuses, are not automatically a uniqueness problem.",
  },
  {
    key: "validity",
    label: "Validity",
    question: "Do values match the checks FACILIO can actually run?",
    detail:
      "Validity is assessed only when FACILIO has a contract it can check, such as an email pattern or a date type it already inferred. If no such checks apply, Validity stays not assessed — not 100.",
  },
  {
    key: "consistency",
    label: "Consistency",
    question: "Are similar values represented the same way?",
    detail:
      "FACILIO can notice mixed capitalization, extra spaces, mixed types, or mixed date formats in text it can inspect. It does not know which spelling your business prefers until you choose a cleanup.",
  },
  {
    key: "integrity",
    label: "Integrity",
    question: "Are related records consistent across datasets?",
    detail:
      "Integrity is not assessed in this product. FACILIO has no foreign keys or cross-dataset rules to evaluate. It does not pretend Integrity scored 100.",
  },
] as const;

export function QualityDimensions() {
  const [selected, setSelected] =
    useState<(typeof DIMENSIONS)[number]["key"]>("completeness");
  const current = DIMENSIONS.find((item) => item.key === selected);
  if (!current) {
    return null;
  }

  function selectDimension(key: (typeof DIMENSIONS)[number]["key"], focus = false) {
    setSelected(key);
    if (focus) {
      requestAnimationFrame(() => {
        document.getElementById(`quality-tab-${key}`)?.focus();
      });
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const keys = DIMENSIONS.map((item) => item.key);
    const index = keys.indexOf(selected);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = keys[(index + 1) % keys.length];
      if (next) {
        selectDimension(next, true);
      }
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = keys[(index - 1 + keys.length) % keys.length];
      if (next) {
        selectDimension(next, true);
      }
    }
    if (event.key === "Home") {
      event.preventDefault();
      const first = keys[0];
      if (first) {
        selectDimension(first, true);
      }
    }
    if (event.key === "End") {
      event.preventDefault();
      const last = keys[keys.length - 1];
      if (last) {
        selectDimension(last, true);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Quality dimensions"
        className="flex flex-wrap gap-2"
      >
        {DIMENSIONS.map((item) => {
          const active = item.key === selected;
          return (
            <button
              key={item.key}
              id={`quality-tab-${item.key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`quality-panel-${item.key}`}
              tabIndex={active ? 0 : -1}
              className={cn(
                "rounded-[var(--facilio-radius-md)] border px-3 py-1.5 text-sm transition-colors duration-[var(--facilio-duration-fast)]",
                active
                  ? "border-ink bg-ink text-canvas"
                  : "border-line bg-surface text-ink hover:bg-subtle",
              )}
              onClick={() => {
                setSelected(item.key);
              }}
              onKeyDown={onTabKeyDown}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        id={`quality-panel-${current.key}`}
        role="tabpanel"
        aria-labelledby={`quality-tab-${current.key}`}
        className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-4"
      >
        <h3 className="text-sm font-medium text-ink">{current.label}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">{current.question}</p>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">{current.detail}</p>
      </div>
    </div>
  );
}
