import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, description, error, children }: FieldProps) {
  const descriptionId = htmlFor ? `${htmlFor}-description` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const support = error ?? description;

  return (
    <div className="block">
      <label htmlFor={htmlFor} className="type-label mb-1.5 block text-ink-secondary">
        {label}
      </label>
      {children}
      {support ? (
        <p
          id={error ? errorId : descriptionId}
          className="type-caption mt-1"
          role={error ? "alert" : undefined}
        >
          <span className={error ? "text-danger" : "text-ink-muted"}>{support}</span>
        </p>
      ) : null}
    </div>
  );
}
