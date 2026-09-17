import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

export function Checkbox({
  label,
  description,
  id,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-10 cursor-pointer items-start gap-2 md:min-h-0",
        disabled && "cursor-not-allowed",
      )}
    >
      <input
        id={id}
        type="checkbox"
        disabled={disabled}
        className={cn("mt-0.5", className)}
        {...props}
      />
      <span>
        <span className={cn("type-body block text-ink", disabled && "text-ink-disabled")}>
          {label}
        </span>
        {description ? (
          <span className="type-caption mt-0.5 block">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
