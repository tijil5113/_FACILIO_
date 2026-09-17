import { Card } from "@/components/ui/Card";
import { CONCEPTS } from "@/features/education/concepts";

import { ExampleLabel } from "../ExampleLabel";
import { LearnModule } from "../LearnModule";
import { ModuleBlock } from "../ModuleBlock";
import { NoticeReveal } from "../NoticeReveal";
import { ProductAction } from "../ProductAction";

export function ProblemsModule() {
  return (
    <LearnModule id="problems" eyebrow="5" title="Review problems">
      <ModuleBlock title="What this is">
        <p>{CONCEPTS.problems.summary}</p>
      </ModuleBlock>
      <ModuleBlock title="What FACILIO shows">
        <ul className="list-disc space-y-1 pl-5">
          <li>What it found</li>
          <li>Where it found it</li>
          <li>Evidence from the selected version</li>
          <li>A suggested action when a safe cleanup exists</li>
        </ul>
      </ModuleBlock>
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
              FACILIO may suggest making the text consistent. This example is not analysis
              of your data.
            </p>
          </NoticeReveal>
        </div>
      </Card>
      <ModuleBlock title="Informational findings">
        <p>{CONCEPTS.problems.informational}</p>
      </ModuleBlock>
      <ProductAction to="/overview?try=1">Review Problems</ProductAction>
    </LearnModule>
  );
}
