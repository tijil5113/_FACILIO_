import { JOURNEY_STAGES } from "@/features/overview/home-content";

export function ProductJourney() {
  return (
    <section aria-labelledby="home-journey-heading">
      <h2 id="home-journey-heading" className="type-section text-ink">
        How FACILIO works
      </h2>
      <ol className="home-journey mt-4">
        {JOURNEY_STAGES.map((stage, index) => (
          <li key={stage.title} className="home-journey-step">
            <p className="type-meta text-ink-muted">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="type-card-title mt-1 text-ink">{stage.title}</h3>
            <p className="type-body-sm mt-1 text-ink-secondary">{stage.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
