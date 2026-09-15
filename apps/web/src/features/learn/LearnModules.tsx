import type { ReactNode } from "react";

import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { operationDisplayName } from "@/lib/operation-labels";

import { BeforeAfterExample } from "./BeforeAfterExample";
import { ExampleLabel } from "./ExampleLabel";
import { ExampleTable } from "./ExampleTable";
import { LearnModule } from "./LearnModule";
import { NoticeReveal } from "./NoticeReveal";
import { ProcessDiagram } from "./ProcessDiagram";
import { ProductAction } from "./ProductAction";
import { QualityDimensions } from "./QualityDimensions";
import { BranchingIllustration, VersionDiagram } from "./VersionDiagram";

const OPERATIONS = [
  "TRIM_WHITESPACE",
  "NORMALIZE_CASE",
  "REPLACE_VALUE",
  "FILL_MISSING",
  "DROP_MISSING_ROWS",
  "REMOVE_DUPLICATES",
  "RENAME_COLUMN",
  "DROP_COLUMN",
  "CAST_TYPE",
] as const;

export function TwoMinuteModule() {
  return (
    <LearnModule id="start" eyebrow="Module 1" title="FACILIO in 2 minutes">
      <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
        FACILIO helps you understand a file, find measurable problems, preview safe fixes,
        and keep the original available.
      </p>
      <ProcessDiagram
        label="The FACILIO journey"
        steps={[
          "Bring data",
          "Understand",
          "Find problems",
          "Preview fixes",
          "Cleaned version",
          "Reuse cleanup",
          "Follow activity",
        ]}
      />
      <ul className="grid gap-3 md:grid-cols-2">
        <JourneyCard
          title="Bring data"
          body="Upload CSV, XLSX, or JSON. FACILIO keeps your original version available."
          action={<ProductAction to="/datasets?upload=1">Upload data</ProductAction>}
        />
        <JourneyCard
          title="Understand"
          body="FACILIO analyzes measurable characteristics of the selected version. Analysis does not change values."
          action={<ProductAction to="/datasets">View datasets</ProductAction>}
        />
        <JourneyCard
          title="Find problems"
          body="Review issues FACILIO actually detected. A measurement is not automatically a cleanup."
        />
        <JourneyCard
          title="Clean safely"
          body="Choose fixes and preview them before creating another version. FACILIO does not clean merely because it found a problem."
        />
        <JourneyCard
          title="Keep your original"
          body="Cleaning creates another version instead of replacing your original."
        />
        <JourneyCard
          title="Reuse"
          body="Save successful steps as a Cleanup. Saving does not modify a dataset."
          action={<ProductAction to="/workflows">Open Cleanups</ProductAction>}
        />
        <JourneyCard
          title="Follow"
          body="Activity shows cleanup execution and results: what ran, whether it finished, and where the result is."
          action={<ProductAction to="/jobs">View Activity</ProductAction>}
        />
      </ul>
      <Callout tone="info" title="You can skip Learn">
        FACILIO never requires these topics. Home still starts with Upload my data or Try
        FACILIO.
      </Callout>
    </LearnModule>
  );
}

export function UnderstandDataModule() {
  return (
    <LearnModule id="data" eyebrow="Module 2" title="Understand your data">
      <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
        A dataset is one uploaded source plus every version created from it. After upload,
        you work with a dataset — not a one-off file.
      </p>
      <ExampleTable
        caption="A tiny customer table"
        columns={["customer_name", "status", "lifetime_value"]}
        rows={[
          ["Alice", "active", "1200"],
          ["Bob", "active", "(blank)"],
        ]}
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        <Concept
          title="Dataset"
          body="One uploaded source plus every version created from it. After upload you work with a dataset, not a one-off file."
        />
        <Concept
          title="Rows"
          body="Rows represent records. Alice and Bob are two records."
        />
        <Concept
          title="Columns"
          body="Columns represent fields such as status or lifetime_value."
        />
        <Concept
          title="Missing values"
          body="Bob’s lifetime_value is blank. A blank may reduce completeness."
        />
        <Concept
          title="Data types"
          body="FACILIO infers a type for each column, such as text or number. That is a measurement of the selected version, not a business guarantee."
        />
        <Concept
          title="Distinct values"
          body="How many different values appear in a column. Many “active” statuses can be normal. Distinctness is not the same as uniqueness of whole rows."
        />
        <Concept
          title="Preview"
          body="Preview shows cells from the version you are viewing. It is not a cleaned result until you approve a cleanup."
        />
        <Concept
          title="Analysis"
          body="Analyze measures the selected version. It does not rewrite values."
        />
      </ul>
      <section className="space-y-3" aria-labelledby="analysis-heading">
        <h3 id="analysis-heading" className="text-sm font-medium text-ink">
          What Analyze does
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
          Analysis measures the selected version. It does not rewrite values. FACILIO can
          count rows and columns, find missing values and duplicate rows, inspect types,
          and note consistency patterns it can actually measure.
        </p>
        <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
          FACILIO can detect that a value is missing. It cannot automatically know whether
          the correct value should have been $500 or $5,000.
        </p>
        <Callout tone="neutral" title="What FACILIO does not know">
          Analysis is not a statement that the data is business-correct. It does not
          validate every rule your team might have.
        </Callout>
        <TechnicalDetails>
          <p>
            Analyze creates a profile snapshot for a DatasetVersion. It records row and
            column counts, missing cells, duplicate full-row tuples, inferred physical
            types, optional semantic hints such as email, and quality dimensions.
          </p>
        </TechnicalDetails>
      </section>
      <ProductAction to="/datasets">Review my datasets</ProductAction>
    </LearnModule>
  );
}

export function FindProblemsModule() {
  return (
    <LearnModule id="problems" eyebrow="Module 3" title="Find problems">
      <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
        Problems are findings worth reviewing. They come from measurements FACILIO already
        made — not from invented business rules.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        <Concept
          title="Observation"
          body="Something FACILIO measured, such as mixed capitalization in a column."
        />
        <Concept
          title="Problem"
          body="An observation worth reviewing on Problems. Nothing has been changed yet."
        />
        <Concept
          title="Actionable problem"
          body="FACILIO has a safe cleanup action for it, shown as a suggested fix."
        />
        <Concept
          title="Informational finding"
          body="Worth knowing, listed under Worth reviewing. FACILIO should not automatically change it."
        />
      </ul>
      <section
        id="quality"
        className="scroll-mt-20 space-y-4"
        aria-labelledby="quality-heading"
      >
        <h3 id="quality-heading" className="text-sm font-medium text-ink">
          Data quality
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
          Quality scores summarize the checks FACILIO actually assessed. They are not a
          universal statement that the data is “correct.” A higher score does not prove
          business correctness.
        </p>
        <QualityDimensions />
        <Callout tone="neutral" title="Not assessed stays not assessed">
          If Integrity is not assessed, FACILIO does not pretend it received 100. That is
          a strength of the product.
        </Callout>
        <TechnicalDetails>
          <p>
            Assessed dimensions are completeness, uniqueness, validity, and consistency
            when their contracts apply. Integrity is always NOT_ASSESSED in this phase.
            Overall score uses equal weighting of assessed dimensions only.
          </p>
        </TechnicalDetails>
      </section>
      <Card as="section" aria-labelledby="status-example-heading">
        <ExampleLabel />
        <h3 id="status-example-heading" className="text-sm font-medium text-ink">
          status
        </h3>
        <ul className="mt-3 space-y-1 font-mono text-sm text-ink">
          <li>ACTIVE</li>
          <li>active</li>
          <li>Active</li>
        </ul>
        <div className="mt-4">
          <NoticeReveal prompt="What might FACILIO notice?">
            <p>Inconsistent capitalization.</p>
            <p className="mt-2">
              FACILIO may recommend making the text consistent. This example is not
              analysis of your data.
            </p>
          </NoticeReveal>
        </div>
      </Card>
      <ProductAction to="/overview?try=1">Try this with real sample data</ProductAction>
    </LearnModule>
  );
}

export function CleanSafelyModule() {
  return (
    <LearnModule id="cleaning" eyebrow="Module 4" title="Clean safely">
      <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
        FACILIO does not automatically clean data merely because it detected a problem.
      </p>
      <ProcessDiagram
        label="Safe cleaning sequence"
        steps={[
          "Problem",
          "Suggested cleanup",
          "Your choice",
          "Preview",
          "Approval",
          "New version",
        ]}
      />
      <Callout tone="info" title="Why preview matters">
        Preview shows the effect of your chosen steps without writing a version. You can
        walk away. Nothing is saved until you approve.
      </Callout>
      <BeforeAfterExample />
      <section className="space-y-3" aria-labelledby="operations-heading">
        <h3 id="operations-heading" className="text-sm font-medium text-ink">
          Cleaning operations
        </h3>
        <p className="text-sm leading-6 text-ink-secondary">
          These are the families FACILIO offers in Clean. Making text consistent includes
          lowercase, uppercase, and title case.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {OPERATIONS.map((code) => (
            <li
              key={code}
              className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              {operationDisplayName(code)}
            </li>
          ))}
        </ul>
      </section>
      <section
        className="grid gap-3 md:grid-cols-2"
        aria-labelledby="guided-manual-heading"
      >
        <h3 id="guided-manual-heading" className="sr-only">
          Guided Cleanup and Manual Clean
        </h3>
        <Card as="article">
          <h4 className="text-sm font-medium text-ink">Guided Cleanup</h4>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Best when FACILIO has already detected problems and can suggest safe actions.
          </p>
        </Card>
        <Card as="article">
          <h4 className="text-sm font-medium text-ink">Manual Clean</h4>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Best when you already know the exact change you want.
          </p>
        </Card>
      </section>
      <p className="text-sm text-ink-secondary">
        Neither path is “better.” Both preview before a new version.
      </p>
      <TechnicalDetails>
        <p>
          Clean applies registered deterministic transformations. Preview is ephemeral.
          Apply writes a new DatasetVersion. Operation codes remain in Technical details
          and APIs, not in beginner lists.
        </p>
      </TechnicalDetails>
      <ProductAction to="/overview?try=1">Try this with real sample data</ProductAction>
    </LearnModule>
  );
}

export function VersionsModule() {
  return (
    <LearnModule id="versions" eyebrow="Module 5" title="Versions and your original">
      <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
        FACILIO does not overwrite V1. The cleaned result becomes V2. You can inspect
        both.
      </p>
      <VersionDiagram />
      <ul className="grid gap-3 sm:grid-cols-2">
        <Concept
          title="Original"
          body="The first version from the uploaded file. Never overwritten."
        />
        <Concept
          title="Cleaned version"
          body="A version created by Clean or by running a saved Cleanup."
        />
        <Concept
          title="Viewing"
          body="The version on screen. It may differ from the one you are using."
        />
        <Concept
          title="Using"
          body="The working default. History can switch it with Use this version."
        />
        <Concept
          title="History"
          body="History lists versions and how they were created. Use this version points FACILIO at an existing version. It does not delete others."
        />
      </ul>
      <details className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          More about versions
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-ink-secondary">
            You can create a new version from an older version. That can look linear (V1 →
            V2 → V3) or branched.
          </p>
          <BranchingIllustration />
        </div>
      </details>
      <TechnicalDetails>
        <p>
          Versions are immutable DatasetVersion records with parent lineage. Use this
          version updates the current pointer. It does not delete other versions.
        </p>
      </TechnicalDetails>
      <ProductAction to="/overview?try=1">Try this with real sample data</ProductAction>
    </LearnModule>
  );
}

export function CleanupsModule() {
  return (
    <LearnModule id="cleanups" eyebrow="Module 6" title="Save and reuse cleanups">
      <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
        A Cleanup is a saved set of cleaning steps that can be reused. Saving a Cleanup
        does not modify a dataset. Running it against compatible data performs the actual
        work.
      </p>
      <Card as="section" aria-labelledby="cleanup-example-heading">
        <ExampleLabel />
        <h3 id="cleanup-example-heading" className="text-sm font-medium text-ink">
          Customer Data Cleanup
        </h3>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-secondary">
          <li>Remove extra spaces</li>
          <li>Make Status lowercase</li>
          <li>Fill missing Lifetime Value</li>
          <li>Remove duplicate rows</li>
        </ol>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card as="article">
          <h3 className="text-sm font-medium text-ink">Cleanup</h3>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Reusable instructions. Opening Cleanups does not change your files.
          </p>
        </Card>
        <Card as="article">
          <h3 className="text-sm font-medium text-ink">Cleaned version</h3>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            The resulting data after a successful cleanup run.
          </p>
        </Card>
      </div>
      <Callout tone="neutral" title="Compatibility">
        A saved Cleanup can only run when the target data contains the columns and types
        its steps need. If it doesn’t match this file, FACILIO will say so instead of
        guessing.
      </Callout>
      <TechnicalDetails>
        <p>
          A Cleanup is a Workflow: an ordered list of WorkflowSteps. Runs snapshot the
          revision they used. Compatibility checks projected columns before execution.
        </p>
      </TechnicalDetails>
      <div className="flex flex-wrap gap-2">
        <ProductAction to="/workflows">Open Cleanups</ProductAction>
        <ProductAction to="/overview?try=1">Try FACILIO</ProductAction>
      </div>
    </LearnModule>
  );
}

export function ActivityModule() {
  return (
    <LearnModule id="activity" eyebrow="Module 7" title="Follow your activity">
      <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
        Activity answers: What ran? What data did it use? Is it still running? Did it
        finish? Where is the result?
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {[
          "Waiting to start",
          "Running",
          "Stopping",
          "Done",
          "Couldn't finish",
          "Cancelled",
        ].map((status) => (
          <li
            key={status}
            className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            {status}
          </li>
        ))}
      </ul>
      <Callout tone="warning" title="Failures stay honest">
        If a cleanup cannot finish successfully, FACILIO does not present a partial
        cleaned version as a successful result. No cleaned version was created. Your
        original is unchanged.
      </Callout>
      <TechnicalDetails>
        <p>
          Activity is a Job. The domain record of one execution is a WorkflowRun.
          Attempts, workers, and heartbeats live in job detail Technical details.
        </p>
      </TechnicalDetails>
      <ProductAction to="/jobs">View Activity</ProductAction>
    </LearnModule>
  );
}

function JourneyCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <li>
      <Card as="article" className="h-full">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">{body}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </Card>
    </li>
  );
}

function Concept({ title, body }: { title: string; body: string }) {
  return (
    <li>
      <Card as="article" className="h-full">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">{body}</p>
      </Card>
    </li>
  );
}
