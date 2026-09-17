import { TRUST_POINTS } from "@/features/overview/home-content";

export function TrustMessage() {
  return (
    <section aria-labelledby="home-trust-heading">
      <h2 id="home-trust-heading" className="sr-only">
        How FACILIO treats your data
      </h2>
      <ul className="home-trust">
        {TRUST_POINTS.map((point) => (
          <li key={point} className="type-body-sm text-ink-secondary">
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}
