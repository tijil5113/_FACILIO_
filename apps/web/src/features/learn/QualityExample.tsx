import { ExampleLabel } from "./ExampleLabel";
import { ExampleTable } from "./ExampleTable";

/**
 * Completeness 83.3 matches packages/processing/tests/test_quality.py
 * test_missing_data_completeness_formula: 1 of 6 cells missing.
 * Uniqueness is 100 because the three rows are distinct.
 * Validity, Consistency, and Integrity are not assessed for this numeric example.
 * Overall = mean of assessed scores only: round((83.3 + 100) / 2, 1) = 91.7
 */
export function QualityExample() {
  return (
    <div className="space-y-4">
      <ExampleTable
        caption="Three rows, one missing cell"
        columns={["value_a", "value_b"]}
        rows={[
          ["1", "1"],
          ["Missing", "2"],
          ["3", "3"],
        ]}
      />
      <div className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-4">
        <ExampleLabel />
        <h3 className="text-sm font-medium text-ink">What FACILIO would measure</h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-secondary">
          <li>
            Completeness <span className="font-mono text-ink">83.3</span> — 1 of 6 cells
            are missing.
          </li>
          <li>
            Uniqueness <span className="font-mono text-ink">100</span> — the three rows
            are different.
          </li>
          <li>Validity — not assessed. No email or date contract applies here.</li>
          <li>Consistency — not assessed. These columns are not mixed text values.</li>
          <li>Integrity — not assessed, and excluded from the overall score.</li>
          <li>
            Overall <span className="font-mono text-ink">91.7</span> — the mean of 83.3
            and 100 only. Not-assessed dimensions are left out, not treated as 0.
          </li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-ink-secondary">
          91.7 is not a statement that the table is 91.7% correct for a business purpose.
        </p>
      </div>
    </div>
  );
}
