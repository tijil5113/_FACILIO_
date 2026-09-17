import { Link, useLocation } from "react-router";
import { X } from "lucide-react";

import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { detectHelpContext } from "@/features/help/help-context";
import { HELP_CONTENT } from "@/features/help/help-content";
import { useUiStore } from "@/stores/ui-store";

export function HelpDrawer() {
  const open = useUiStore((state) => state.helpOpen);
  const closeHelp = useUiStore((state) => state.closeHelp);
  const location = useLocation();
  const contextId = detectHelpContext(location.pathname, location.search);
  const content = HELP_CONTENT[contextId];
  const titleId = "help-drawer-title";

  return (
    <Drawer
      open={open}
      onClose={closeHelp}
      title={content.title}
      labelledBy={titleId}
      overlayLabel="Close help"
      contextAttr={content.id}
      initialFocusSelector="[data-help-close]"
      className="bg-raised"
    >
      <div className="flex min-h-full flex-col">
        <div className="sticky top-0 z-[var(--facilio-z-sticky)] flex items-start justify-between gap-3 border-b border-line bg-raised px-5 py-4">
          <div>
            <p className="type-meta text-ink-muted uppercase">Help</p>
            <h2 id={titleId} className="mt-1 text-base font-semibold text-ink">
              {content.title}
            </h2>
          </div>
          <IconButton label="Close help" data-help-close="" onClick={closeHelp}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="space-y-6 px-5 py-5">
          <section aria-labelledby="help-question">
            <h3 id="help-question" className="text-sm font-medium text-ink">
              {content.question}
            </h3>
            <p className="type-body mt-2 text-ink-secondary">{content.summary}</p>
          </section>
          <section aria-labelledby="help-actions">
            <h3 id="help-actions" className="type-label tracking-wide text-ink">
              What you can do
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-secondary">
              {content.actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="help-know">
            <h3 id="help-know" className="type-label tracking-wide text-ink">
              Good to know
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-secondary">
              {content.goodToKnow.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="help-learn">
            <h3 id="help-learn" className="type-label tracking-wide text-ink">
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
            <TechnicalDetails>
              <ul className="list-disc space-y-1 pl-5">
                {content.technical.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </TechnicalDetails>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}
