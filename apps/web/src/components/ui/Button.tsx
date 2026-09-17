import type { ButtonHTMLAttributes } from "react";

import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button-styles";
import { Spinner } from "@/components/ui/Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const busy = loading || disabled;
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      disabled={busy}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="shrink-0" /> : null}
      {children}
    </button>
  );
}
