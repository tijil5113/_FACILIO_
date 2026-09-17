import { ButtonLink } from "@/components/ui/ButtonLink";

export function NotFoundPage() {
  return (
    <section className="page-enter mx-auto max-w-xl">
      <h1 className="type-page-title">Page not found</h1>
      <p className="type-body mt-3 text-ink-secondary">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink to="/overview">Go Home</ButtonLink>
        <ButtonLink to="/datasets" variant="secondary">
          Datasets
        </ButtonLink>
      </div>
    </section>
  );
}
