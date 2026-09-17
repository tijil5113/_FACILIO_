import { useState } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { VersionLabel } from "@/components/ui/VersionLabel";
import {
  EXAMPLE_COLUMNS,
  EXAMPLE_DISCLAIMER,
  EXAMPLE_ROWS,
  INTERACTIVE_STAGES,
  type InteractiveStage,
} from "@/features/public/public-content";

const STAGE_COPY: Record<InteractiveStage, string> = {
  before: "Uploaded values, including extra spaces and mixed capitalization.",
  problems:
    "FACILIO flags measurable issues. A missing name is identified, not invented.",
  preview: "Proposed values. Nothing is saved until you approve.",
  after: "V2 exists only after approval. V1 Original remains.",
};

export function InteractiveStory() {
  const [stage, setStage] = useState<InteractiveStage>("before");

  return (
    <section className="public-section" aria-labelledby="interactive-heading">
      <p className="type-meta text-ink-muted uppercase">See what FACILIO does</p>
      <h2 id="interactive-heading" className="type-page-title mt-2 text-ink">
        From messy values to a cleaned version
      </h2>
      <p className="type-body mt-3 max-w-2xl text-ink-secondary">
        This example is deterministic illustration, not a live analysis. It uses the same
        Before → Problems → Preview → After sequence as the product.
      </p>
      <div className="mt-6">
        <SegmentedControl
          legend="Example stage"
          value={stage}
          options={INTERACTIVE_STAGES.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
          onChange={setStage}
        />
      </div>
      <div className="mt-5 rounded-[var(--facilio-radius-md)] border border-line bg-surface p-4 md:p-5">
        <p className="type-meta text-ink-muted">{EXAMPLE_DISCLAIMER}</p>
        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <VersionLabel version={{ version_number: 1, kind: "ORIGINAL" }} />
          {stage === "after" ? (
            <>
              <span className="type-caption" aria-hidden="true">
                →
              </span>
              <VersionLabel version={{ version_number: 2, kind: "DERIVED" }} />
            </>
          ) : (
            <span className="type-caption">Preview does not create V2</span>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="signature-grid">
            <caption className="sr-only">
              Illustrative customer example at the selected stage
            </caption>
            <thead>
              <tr>
                <th scope="col">{EXAMPLE_COLUMNS[0]}</th>
                <th scope="col">{EXAMPLE_COLUMNS[1]}</th>
                {stage === "problems" ? <th scope="col">Finding</th> : null}
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_ROWS.map((row) => {
                const showAfter = stage === "preview" || stage === "after";
                const name = showAfter ? row.after[0] : row.before[0];
                const status = showAfter ? row.after[1] : row.before[1];
                return (
                  <tr key={row.id}>
                    <td>
                      <span
                        className={
                          showAfter && row.cleaned && row.before[0] !== row.after[0]
                            ? "type-data change-after"
                            : "type-data"
                        }
                      >
                        {name}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          showAfter && row.before[1] !== row.after[1]
                            ? "type-data change-after"
                            : "type-data"
                        }
                      >
                        {status}
                      </span>
                    </td>
                    {stage === "problems" ? (
                      <td className="type-caption text-ink-secondary">{row.problem}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="type-body-sm mt-4 text-ink-secondary" aria-live="polite">
          {STAGE_COPY[stage]}
        </p>
      </div>
    </section>
  );
}
