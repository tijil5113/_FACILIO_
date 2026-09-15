import { Menu, Search } from "lucide-react";
import { useLocation } from "react-router";

import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { HelpTrigger } from "@/features/help/HelpTrigger";
import { ThemeToggle } from "@/features/preferences/ThemeToggle";
import { CompactHealth } from "@/features/system-health/CompactHealth";
import { titleForPath } from "@/lib/navigation";
import { modifierLabel } from "@/lib/platform";
import { useUiStore } from "@/stores/ui-store";

export function ContextBar() {
  const location = useLocation();
  const openMobileNav = useUiStore((state) => state.openMobileNav);
  const openCommandPalette = useUiStore((state) => state.openCommandPalette);
  const contextTitle = useUiStore((state) => state.contextTitle);
  const title = contextTitle || titleForPath(location.pathname);

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-3 md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton label="Open navigation" className="md:hidden" onClick={openMobileNav}>
          <Menu size={16} aria-hidden="true" />
        </IconButton>
        <div className="min-w-0">
          <p className="text-[11px] text-ink-muted">FACILIO</p>
          <p className="truncate text-sm font-medium tracking-tight">{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="hidden sm:flex">
          <CompactHealth />
        </div>
        <HelpTrigger />
        <ThemeToggle />
        <button
          type="button"
          onClick={openCommandPalette}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--facilio-radius-md)] border border-line bg-raised px-2 text-xs text-ink-muted transition-colors duration-[var(--facilio-duration-fast)] ease-[var(--facilio-ease)] hover:bg-subtle hover:text-ink md:h-8"
          aria-label="Open command palette"
        >
          <Search size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Commands</span>
          <span className="hidden md:flex items-center gap-0.5">
            <Kbd>{modifierLabel()}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>
    </header>
  );
}
