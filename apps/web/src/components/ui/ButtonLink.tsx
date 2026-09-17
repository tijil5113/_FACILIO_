import { Link, type LinkProps } from "react-router";
import type { ReactNode } from "react";

import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button-styles";

interface ButtonLinkProps {
  to: LinkProps["to"];
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function ButtonLink({
  to,
  children,
  variant = "primary",
  size = "md",
  className,
}: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClassName({ variant, size, className })}>
      {children}
    </Link>
  );
}
