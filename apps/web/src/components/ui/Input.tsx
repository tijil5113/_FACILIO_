import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, id, className, error, ...props }: InputProps) {
  const errorId = id ? `${id}-error` : undefined;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-xs font-medium text-ink-secondary">{label}</span>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-9 w-full rounded-[var(--facilio-radius-md)] border border-line bg-raised px-3 text-sm text-ink outline-none transition-[border-color,background-color] duration-[var(--facilio-duration-fast)] ease-[var(--facilio-ease)] placeholder:text-ink-muted focus:border-accent disabled:bg-subtle disabled:text-ink-muted",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error ? (
        <span id={errorId} className="mt-1 block text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
