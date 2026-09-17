import { Link } from "react-router";

import { SignatureScene } from "@/components/brand/SignatureScene";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProductJourney } from "@/features/overview/ProductJourney";
import { InteractiveStory } from "@/features/public/InteractiveStory";
import {
  PUBLIC_CAPABILITIES,
  PUBLIC_CREATE_ACCOUNT,
  PUBLIC_FINAL_HEADLINE,
  PUBLIC_FINAL_SUPPORT,
  PUBLIC_HEADLINE,
  PUBLIC_PRIMARY_CTA,
  PUBLIC_PRODUCT,
  PUBLIC_SAFETY_HEADLINE,
  PUBLIC_SAFETY_STEPS,
  PUBLIC_SAFETY_SUPPORT,
  PUBLIC_SECONDARY_CTA,
  PUBLIC_SIGN_IN,
  PUBLIC_SUPPORT,
} from "@/features/public/public-content";

const headlineLines = PUBLIC_HEADLINE.split("\n");

export function PublicHome() {
  return (
    <div className="page-enter">
      <section className="public-hero" aria-labelledby="public-hero-heading">
        <div className="public-hero-copy">
          <p className="type-meta text-ink-muted uppercase">{PUBLIC_PRODUCT}</p>
          <h1 id="public-hero-heading" className="type-hero mt-3 text-ink">
            {headlineLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="type-body mt-4 max-w-xl text-ink-secondary">{PUBLIC_SUPPORT}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ButtonLink to="/overview">{PUBLIC_PRIMARY_CTA}</ButtonLink>
            <ButtonLink to="/overview?try=1" variant="secondary">
              {PUBLIC_SECONDARY_CTA}
            </ButtonLink>
          </div>
          <p className="type-body-sm mt-4 text-ink-muted">
            <Link
              to="/login"
              className="underline decoration-line underline-offset-4 hover:text-ink"
            >
              {PUBLIC_SIGN_IN}
            </Link>
            <span aria-hidden="true"> · </span>
            <Link
              to="/signup"
              className="underline decoration-line underline-offset-4 hover:text-ink"
            >
              {PUBLIC_CREATE_ACCOUNT}
            </Link>
            <span className="text-ink-muted"> — accounts are not available yet.</span>
          </p>
        </div>
        <SignatureScene />
      </section>

      <section
        id="product"
        className="public-section"
        aria-labelledby="capabilities-heading"
      >
        <p className="type-meta text-ink-muted uppercase">See what FACILIO does</p>
        <h2 id="capabilities-heading" className="type-page-title mt-2 text-ink">
          Inspect, preview, then keep a cleaned version
        </h2>
        <ol className="public-capabilities mt-6">
          {PUBLIC_CAPABILITIES.map((item, index) => (
            <li key={item.title} className="public-capability">
              <p className="type-meta text-ink-muted">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="type-card-title mt-1 text-ink">{item.title}</h3>
              <p className="type-body-sm mt-1 text-ink-secondary">{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <InteractiveStory />

      <section className="public-section" aria-labelledby="safety-heading">
        <p className="type-meta text-ink-muted uppercase">Safety model</p>
        <h2 id="safety-heading" className="type-page-title mt-2 text-ink">
          {PUBLIC_SAFETY_HEADLINE}
        </h2>
        <p className="type-body mt-3 max-w-2xl text-ink-secondary">
          {PUBLIC_SAFETY_SUPPORT}
        </p>
        <ol className="public-safety mt-6">
          {PUBLIC_SAFETY_STEPS.map((step, index) => (
            <li key={step.key} className="public-safety-step">
              <p className="type-meta text-ink-muted">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="type-card-title mt-1 text-ink">{step.label}</h3>
              <p className="type-body-sm mt-1 text-ink-secondary">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <div id="how-it-works" className="public-section">
        <ProductJourney />
      </div>

      <section
        className="public-section public-final"
        aria-labelledby="final-cta-heading"
      >
        <h2 id="final-cta-heading" className="type-page-title text-ink">
          {PUBLIC_FINAL_HEADLINE}
        </h2>
        <p className="type-body mt-3 max-w-xl text-ink-secondary">
          {PUBLIC_FINAL_SUPPORT}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <ButtonLink to="/overview">{PUBLIC_PRIMARY_CTA}</ButtonLink>
          <ButtonLink to="/overview?try=1" variant="secondary">
            {PUBLIC_SECONDARY_CTA}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
