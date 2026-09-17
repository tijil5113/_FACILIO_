import { VersionLabel } from "@/components/ui/VersionLabel";
import {
  EXAMPLE_COLUMNS,
  EXAMPLE_DISCLAIMER,
  EXAMPLE_FINDINGS,
  EXAMPLE_ROWS,
} from "@/features/public/public-content";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/cn";

const ORIGINAL = { version_number: 1, kind: "ORIGINAL" as const };
const CLEANED = { version_number: 2, kind: "DERIVED" as const };

export function SignatureScene({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <figure
      className={cn("signature-scene", compact && "signature-scene-compact", className)}
      data-animate={reduced ? "false" : "true"}
      data-testid="signature-scene"
      aria-label="Example of messy values becoming a cleaned version. FACILIO keeps the original and creates V2 after you approve. These values are examples, not your data."
    >
      <figcaption className="type-meta text-ink-muted">{EXAMPLE_DISCLAIMER}</figcaption>
      <div className="signature-lineage">
        <VersionLabel version={ORIGINAL} />
        <span className="signature-connector" aria-hidden="true">
          →
        </span>
        <VersionLabel version={CLEANED} />
      </div>
      <div className="signature-grid-wrap">
        <table className="signature-grid">
          <caption className="sr-only">
            Example table showing customer_name and status before and after cleaning
          </caption>
          <thead>
            <tr>
              <th scope="col">{EXAMPLE_COLUMNS[0]}</th>
              <th scope="col">{EXAMPLE_COLUMNS[1]}</th>
              <th scope="col">After</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_ROWS.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="type-data change-before signature-before">
                    {row.before[0]}
                  </span>
                </td>
                <td>
                  <span className="type-data change-before signature-before">
                    {row.before[1]}
                  </span>
                </td>
                <td>
                  <span
                    className={cn(
                      "type-data signature-after",
                      row.cleaned ? "change-after" : "text-ink-secondary",
                    )}
                  >
                    {row.after[0]} · {row.after[1]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="signature-findings">
        {EXAMPLE_FINDINGS.map((finding) => (
          <li key={finding} className="signature-finding">
            {finding}
          </li>
        ))}
      </ul>
      <p className="type-body-sm mt-4 text-ink-secondary">
        Extra spaces and inconsistent capitalization can be cleaned after preview. A
        missing name is identified and left unchanged unless you choose a fill.
      </p>
    </figure>
  );
}
