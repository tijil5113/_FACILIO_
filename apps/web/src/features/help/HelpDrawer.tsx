import { useEffect, useId, useRef } from "react";
import { Link, useLocation } from "react-router";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

import { IconButton } from "@/components/ui/IconButton";
import { detectHelpContext } from "@/features/help/help-context";
import { HELP_CONTENT } from "@/features/help/help-content";
import { useUiStore } from "@/stores/ui-store";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HelpDrawer() {
  const open = useUiStore((state) => state.helpOpen);
  const closeHelp = useUiStore((state) => state.closeHelp);
  const location = useLocation();
  const contextId = detectHelpContext(location.pathname, location.search);
  const content = HELP_CONTENT[contextId];
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const closeButton = panel?.querySelector<HTMLElement>("[data-help-close]");
    closeButton?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHelp();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => !node.hasAttribute("disabled") && node.tabIndex !== -1,
      );
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
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
  }, [closeHelp, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        className="overlay-enter absolute inset-0 bg-[var(--facilio-overlay)]"
        aria-label="Close help"
        onClick={closeHelp}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-help-context={content.id}
        className="drawer-enter relative flex h-full w-full max-w-full min-w-0 flex-col overflow-y-auto border-l border-line bg-raised shadow-[var(--facilio-shadow)] sm:max-w-[440px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">
              Help
            </p>
            <h2 id={titleId} className="mt-1 text-base font-semibold text-ink">
              {content.title}
            </h2>
          </div>
          <IconButton label="Close help" data-help-close="" onClick={closeHelp}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="space-y-6 px-5 py-5">
          <p className="text-sm leading-6 text-ink-secondary">{content.summary}</p>
          <section aria-labelledby="help-actions">
            <h3 id="help-actions" className="text-xs font-medium tracking-wide text-ink">
              What you can do
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-secondary">
              {content.actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="help-know">
            <h3 id="help-know" className="text-xs font-medium tracking-wide text-ink">
              Good to know
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-secondary">
              {content.goodToKnow.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="help-learn">
            <h3 id="help-learn" className="text-xs font-medium tracking-wide text-ink">
              Learn more
            </h3>
            <p className="mt-2">
              <Link
                to={content.learnHref}
                className="text-sm text-ink-secondary underline decoration-line underline-offset-4 hover:text-ink"
                onClick={closeHelp}
              >
                {content.learnLabel}
              </Link>
            </p>
          </section>
          {content.technical?.length ? (
            <section aria-labelledby="help-technical">
              <h3
                id="help-technical"
                className="text-xs font-medium tracking-wide text-ink"
              >
                Technical help
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-muted">
                {content.technical.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
