import { Link } from "react-router";

import { cn } from "@/lib/cn";

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
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-[var(--facilio-radius-md)] px-3 text-sm font-medium",
        variant === "primary"
          ? "border border-ink bg-ink text-canvas hover:bg-ink/90 dark:text-[#121410]"
          : "border border-line bg-surface text-ink hover:bg-subtle",
      )}
    >
      {children}
    </Link>
  );
}
