import { Link } from "react-router";

import { buttonClassName, type ButtonVariant } from "@/components/ui/button-styles";

interface ProductActionProps {
  to: string;
  children: string;
  variant?: "primary" | "secondary";
}

export function ProductAction({
  to,
  children,
  variant = "secondary",
}: ProductActionProps) {
  const buttonVariant: ButtonVariant = variant;
  return (
    <Link to={to} className={buttonClassName({ variant: buttonVariant })}>
      {children}
    </Link>
  );
}
