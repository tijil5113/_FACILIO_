import { VersionLabel } from "@/components/ui/VersionLabel";
import {
  ILLUSTRATIVE_DISCLAIMER,
  ILLUSTRATIVE_PAIRS,
  ILLUSTRATIVE_VERSIONS,
  SIGNATURE_VISUAL_LABEL,
} from "@/features/overview/home-content";

export function TransformationStory({ animate = true }: { animate?: boolean }) {
  return (
    <figure
      className="home-story"
      aria-label={SIGNATURE_VISUAL_LABEL}
      data-testid="home-signature-visual"
    >
      <figcaption className="type-meta text-ink-muted">
        {ILLUSTRATIVE_DISCLAIMER}
      </figcaption>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <VersionLabel version={ILLUSTRATIVE_VERSIONS.before} />
        <span className="type-caption hidden sm:inline" aria-hidden="true">
          →
        </span>
        <VersionLabel version={ILLUSTRATIVE_VERSIONS.after} />
      </div>
      <ul className="mt-5 space-y-3">
        {ILLUSTRATIVE_PAIRS.map((pair) => (
          <li key={pair.id} className="home-story-row">
            <p className="type-caption col-span-full sm:col-auto">{pair.problem}</p>
            <span className="type-data change-before min-w-0 break-all">
              {pair.before}
            </span>
            <span className="type-caption text-ink-muted" aria-hidden="true">
              →
            </span>
            <span
              className={`type-data change-after min-w-0 break-all rounded-[var(--facilio-radius-sm)] px-1.5 py-0.5 ${animate ? "home-story-after" : ""}`}
            >
              {pair.after}
            </span>
          </li>
        ))}
      </ul>
      <p className="type-body-sm mt-5 text-ink-secondary">
        Messy values stay on the original. A cleaned version appears after you preview and
        approve.
      </p>
    </figure>
  );
}
