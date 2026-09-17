import { Link } from "react-router";
import type { ReactNode } from "react";

import { RouteFocus } from "@/components/a11y/RouteFocus";
import { FacilioMark } from "@/components/brand/FacilioMark";
import { LineageMotif } from "@/components/brand/LineageMotif";
import { SignatureScene } from "@/components/brand/SignatureScene";
import { PUBLIC_PRODUCT } from "@/features/public/public-content";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-shell min-h-screen bg-canvas text-ink">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="auth-frame">
        <aside className="auth-brand" aria-label="Product story">
          <Link to="/" className="flex items-center gap-2.5" aria-label={PUBLIC_PRODUCT}>
            <FacilioMark size="md" />
            <span className="font-sans text-[13px] font-semibold tracking-[0.14em] text-ink">
              {PUBLIC_PRODUCT}
            </span>
          </Link>
          <p className="type-section mt-8 text-ink">
            Understand messy data. Clean it with confidence.
          </p>
          <p className="type-body-sm mt-3 max-w-sm text-ink-secondary">
            Preview before cleaning. Keep V1 Original. Create V2 only when you approve.
          </p>
          <div className="mt-6 hidden md:block">
            <SignatureScene compact />
          </div>
          <div className="mt-6 md:hidden">
            <LineageMotif />
          </div>
        </aside>
        <main id="main-content" tabIndex={-1} className="auth-main outline-none">
          <RouteFocus />
          <h1 className="type-page-title text-ink">{title}</h1>
          <p className="type-body mt-2 text-ink-secondary">{subtitle}</p>
          {children}
        </main>
      </div>
    </div>
  );
}
