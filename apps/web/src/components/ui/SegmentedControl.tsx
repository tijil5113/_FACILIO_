import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  legend: string;
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = selectedRef.current;
    const scroller = scrollerRef.current;
    if (!node || !scroller) {
      return;
    }
    const left = node.offsetLeft;
    const right = left + node.offsetWidth;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;
    if (left >= viewLeft && right <= viewRight) {
      return;
    }
    const reduced =
      document.documentElement.dataset.motion === "reduced" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({
      left: Math.max(0, left - (scroller.clientWidth - node.offsetWidth) / 2),
      behavior: reduced ? "auto" : "smooth",
    });
  }, [value]);

  return (
    <fieldset>
      <legend className="type-label mb-2 text-ink-secondary">{legend}</legend>
      <div
        ref={scrollerRef}
        className="inline-flex max-w-full flex-nowrap overflow-x-auto rounded-[var(--facilio-radius-md)] border border-line bg-subtle p-0.5"
        role="radiogroup"
        aria-label={legend}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              ref={selected ? selectedRef : undefined}
              aria-label={option.label}
              className={cn(
                "h-9 min-h-9 shrink-0 rounded-[var(--facilio-radius-sm)] px-3 text-sm whitespace-nowrap transition-colors duration-[var(--facilio-duration-control)] ease-[var(--facilio-ease)] md:h-8 md:min-h-8",
                selected ? "bg-raised text-ink" : "text-ink-muted hover:text-ink",
              )}
              onClick={() => {
                onChange(option.value);
              }}
            >
              {option.label}
              {option.hint ? (
                <span className="ml-1.5 type-caption text-ink-muted">{option.hint}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
