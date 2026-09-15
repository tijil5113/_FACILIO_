import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { X } from "lucide-react";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { IconButton } from "@/components/ui/IconButton";
import { useUiStore } from "@/stores/ui-store";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileNav() {
  const open = useUiStore((state) => state.mobileNavOpen);
  const closeMobileNav = useUiStore((state) => state.closeMobileNav);
  const panelRef = useRef<HTMLElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNav();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => !node.hasAttribute("disabled") && node.tabIndex !== -1,
      );
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const start = nodes[0];
      const end = nodes[nodes.length - 1];
      if (!start || !end) {
        return;
      }
      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        start.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [closeMobileNav, open]);

  if (!open) {
    return null;
  }

  function trapKey(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      closeMobileNav();
    }
  }

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button
        type="button"
        className="overlay-enter absolute inset-0 bg-[var(--facilio-overlay)]"
        aria-label="Close navigation overlay"
        onClick={closeMobileNav}
      />
      <aside
        ref={panelRef}
        className="drawer-enter-left relative h-full w-72 max-w-[85vw] border-r border-line bg-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        onKeyDown={trapKey}
      >
        <div className="absolute top-3 right-3 z-10">
          <IconButton label="Close navigation" onClick={closeMobileNav}>
            <X size={16} />
          </IconButton>
        </div>
        <SidebarNav collapsed={false} onNavigate={closeMobileNav} />
      </aside>
    </div>
  );
}
