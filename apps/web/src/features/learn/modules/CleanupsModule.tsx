import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { CONCEPTS } from "@/features/education/concepts";

import { ExampleLabel } from "../ExampleLabel";
import { LearnModule } from "../LearnModule";
import { ModuleBlock } from "../ModuleBlock";
import { ProductAction } from "../ProductAction";

export function CleanupsModule() {
  return (
    <LearnModule id="cleanups" eyebrow="8" title="Reuse a Cleanup">
      <ModuleBlock title="What this is">
        <p>{CONCEPTS.cleanups.summary}</p>
      </ModuleBlock>
      <Card as="section" aria-labelledby="cleanup-example-heading">
        <ExampleLabel />
        <h3 id="cleanup-example-heading" className="text-sm font-medium text-ink">
          Customer Data Cleanup
        </h3>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-secondary">
          <li>Trim name</li>
          <li>Lowercase status</li>
          <li>Fill missing age</li>
        </ol>
      </Card>
      <ModuleBlock title="Order matters">
        <p>{CONCEPTS.cleanups.order}</p>
      </ModuleBlock>
      <Callout tone="neutral" title="Compatibility">
        A saved Cleanup can run only when the target data has the columns and types its
        steps need. FACILIO will say so instead of guessing.
      </Callout>
      <TechnicalDetails>
        <p>
          A Cleanup is stored as a Workflow: an ordered list of steps. Runs snapshot the
          revision they used. Compatibility checks projected columns before execution.
        </p>
      </TechnicalDetails>
      <div className="flex flex-wrap gap-2">
        <ProductAction to="/workflows" variant="primary">
          Open Cleanups
        </ProductAction>
        <ProductAction to="/overview?try=1">Try FACILIO</ProductAction>
      </div>
    </LearnModule>
  );
}
