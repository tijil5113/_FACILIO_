import type { InputHTMLAttributes } from "react";

import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
}

export function Input({
  label,
  id,
  className,
  error,
  description,
  ...props
}: InputProps) {
  const errorId = id && error ? `${id}-error` : undefined;
  const descriptionId = id && description && !error ? `${id}-description` : undefined;
  return (
    <Field label={label} htmlFor={id} error={error} description={description}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId ?? descriptionId}
        className={cn("facilio-control", className)}
        {...props}
      />
    </Field>
  );
}
