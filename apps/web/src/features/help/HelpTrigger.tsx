import { CircleHelp } from "lucide-react";

import { useUiStore } from "@/stores/ui-store";

export function HelpTrigger() {
  const open = useUiStore((state) => state.helpOpen);
  const toggleHelp = useUiStore((state) => state.toggleHelp);

  return (
    <button
      type="button"
      onClick={toggleHelp}
      aria-expanded={open}
      aria-label="Help"
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-xs text-ink-muted transition-colors duration-[var(--facilio-duration-fast)] hover:bg-subtle hover:text-ink"
    >
      <CircleHelp size={14} aria-hidden="true" />
      <span>Help</span>
    </button>
  );
}
