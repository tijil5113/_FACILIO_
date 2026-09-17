import type { SelectHTMLAttributes } from "react";

import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  description?: string;
}

export function Select({
  label,
  id,
  className,
  error,
  description,
  children,
  ...props
}: SelectProps) {
  const errorId = id && error ? `${id}-error` : undefined;
  const descriptionId = id && description && !error ? `${id}-description` : undefined;
  return (
    <Field label={label} htmlFor={id} error={error} description={description}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId ?? descriptionId}
        className={cn("facilio-control", className)}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}
