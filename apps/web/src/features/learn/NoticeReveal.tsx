import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

interface NoticeRevealProps {
  prompt: string;
  revealLabel?: string;
  hideLabel?: string;
  children: ReactNode;
}

export function NoticeReveal({
  prompt,
  revealLabel = "Show what FACILIO might notice",
  hideLabel = "Hide explanation",
  children,
}: NoticeRevealProps) {
  const [open, setOpen] = useState(false);
  const panelId = "learn-notice-reveal";
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink">{prompt}</p>
      <Button
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {open ? hideLabel : revealLabel}
      </Button>
      {open ? (
        <div
          id={panelId}
          className="rounded-[var(--facilio-radius-md)] border border-line bg-subtle px-4 py-3 text-sm leading-6 text-ink-secondary"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
