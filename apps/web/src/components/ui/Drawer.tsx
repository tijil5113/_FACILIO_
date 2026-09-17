import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  initialFocusSelector?: string;
  overlayLabel?: string;
  contextAttr?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  children,
  className,
  labelledBy,
  initialFocusSelector,
  overlayLabel,
  contextAttr,
}: DrawerProps) {
  const fallbackTitleId = useId();
  const titleId = labelledBy ?? fallbackTitleId;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const preferred = initialFocusSelector
      ? panel?.querySelector<HTMLElement>(initialFocusSelector)
      : null;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (preferred ?? first)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => !node.hasAttribute("disabled") && node.tabIndex !== -1,
      );
      const start = nodes[0];
      const end = nodes[nodes.length - 1];
      if (!start || !end) {
        event.preventDefault();
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
  }, [initialFocusSelector, onClose, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[var(--facilio-z-overlay)] flex",
        side === "right" ? "justify-end" : "justify-start",
      )}
    >
      <button
        type="button"
        className="overlay-enter absolute inset-0 bg-[var(--facilio-overlay)]"
        aria-label={overlayLabel ?? `Close ${title}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-help-context={contextAttr}
        className={cn(
          "relative flex h-full min-w-0 flex-col overflow-y-auto border-line bg-raised",
          side === "right"
            ? "drawer-enter w-full max-w-full border-l sm:max-w-[440px]"
            : "drawer-enter-left w-72 max-w-[85vw] border-r bg-sidebar",
          className,
        )}
      >
        {!labelledBy ? (
          <h2 id={fallbackTitleId} className="sr-only">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
