import { cn } from "@/lib/cn";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
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
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-ink-secondary">{legend}</legend>
      <div
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
              className={cn(
                "h-9 min-h-9 shrink-0 rounded-[var(--facilio-radius-sm)] px-3 text-sm whitespace-nowrap transition-colors duration-[var(--facilio-duration-fast)] ease-[var(--facilio-ease)] md:h-8 md:min-h-8",
                selected
                  ? "bg-raised text-ink shadow-[0_1px_1px_rgb(27_25_20/0.06)]"
                  : "text-ink-muted hover:text-ink",
              )}
              onClick={() => {
                onChange(option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
