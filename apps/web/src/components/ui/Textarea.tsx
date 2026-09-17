import type { TextareaHTMLAttributes } from "react";

import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  description?: string;
}

export function Textarea({
  label,
  id,
  className,
  error,
  description,
  ...props
}: TextareaProps) {
  const errorId = id && error ? `${id}-error` : undefined;
  const descriptionId = id && description && !error ? `${id}-description` : undefined;
  return (
    <Field label={label} htmlFor={id} error={error} description={description}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId ?? descriptionId}
        className={cn("facilio-control", className)}
        {...props}
      />
    </Field>
  );
}
