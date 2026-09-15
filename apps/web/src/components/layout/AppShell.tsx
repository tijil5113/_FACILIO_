import { useEffect } from "react";
import { Outlet } from "react-router";

import { LiveAnnouncer } from "@/components/a11y/LiveAnnouncer";
import { RouteFocus } from "@/components/a11y/RouteFocus";
import { ContextBar } from "@/components/layout/ContextBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { NoticeHost } from "@/components/ui/NoticeHost";
import { CommandPalette } from "@/features/command-palette/CommandPalette";
import { HelpDrawer } from "@/features/help/HelpDrawer";
import { PreferencesSync } from "@/features/preferences/PreferencesSync";
import { cn } from "@/lib/cn";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useUiStore } from "@/stores/ui-store";

export function AppShell() {
  const sidebarCollapsed = usePreferencesStore((state) => state.sidebarCollapsed);
  const toggleHelp = useUiStore((state) => state.toggleHelp);
  const commandPaletteOpen = useUiStore((state) => state.commandPaletteOpen);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "?" && event.key !== "/") {
        return;
      }
      if (event.key === "/" && !event.shiftKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (commandPaletteOpen) {
        return;
      }
      event.preventDefault();
      toggleHelp();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [commandPaletteOpen, toggleHelp]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <PreferencesSync />
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-line bg-sidebar transition-[width] duration-[var(--facilio-duration-base)] ease-out md:block",
            sidebarCollapsed ? "w-16" : "w-60",
          )}
        >
          <SidebarNav collapsed={sidebarCollapsed} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <ContextBar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 py-5 outline-none md:px-8 md:py-7"
          >
            <RouteFocus />
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav />
      <CommandPalette />
      <HelpDrawer />
      <NoticeHost />
      <LiveAnnouncer />
    </div>
  );
}
