import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/Tooltip";

interface DisabledHintProps {
  disabled: boolean;
  reason?: string;
  children: ReactNode;
}

export function DisabledHint({ disabled, reason, children }: DisabledHintProps) {
  if (!disabled || !reason) {
    return children;
  }
  return (
    <Tooltip label={reason} side="bottom">
      <span className="inline-flex" tabIndex={0} title={reason}>
        {children}
      </span>
    </Tooltip>
  );
}
