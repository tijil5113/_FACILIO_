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
      className="inline-flex h-10 items-center gap-1.5 rounded-[var(--facilio-radius-md)] px-2 text-xs text-ink-muted transition-colors duration-[var(--facilio-duration-control)] hover:bg-subtle hover:text-ink md:h-8"
    >
      <CircleHelp size={14} aria-hidden="true" />
      <span className="hidden sm:inline">Help</span>
    </button>
  );
}
