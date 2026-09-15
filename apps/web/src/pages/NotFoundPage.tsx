import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <section className="page-enter mx-auto max-w-xl">
      <h1 className="text-[22px] font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm leading-6 text-ink-secondary">
        This page isn’t part of the FACILIO workspace. The link may be mistyped or no
        longer valid.
      </p>
      <Link
        to="/overview"
        className="mt-6 inline-flex h-9 items-center rounded-[var(--facilio-radius-md)] border border-ink bg-ink px-3 text-sm font-medium text-canvas hover:bg-ink/90 dark:text-[#121410]"
      >
        Return to Home
      </Link>
    </section>
  );
}
