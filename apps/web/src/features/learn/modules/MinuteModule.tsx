import { CONCEPTS } from "@/features/education/concepts";

import { LearnModule } from "../LearnModule";
import { ModuleBlock } from "../ModuleBlock";
import { ProcessDiagram } from "../ProcessDiagram";
import { ProductAction } from "../ProductAction";

export function MinuteModule() {
  return (
    <LearnModule id="start" eyebrow="1" title="FACILIO in a minute">
      <ModuleBlock title="What this is">
        <p>{CONCEPTS.product.what}</p>
      </ModuleBlock>
      <ProcessDiagram
        label="FACILIO in a minute"
        steps={[
          "Bring data",
          "Analyze",
          "Review problems",
          "Preview cleaning",
          "Create cleaned version",
          "Reuse cleaning steps",
        ]}
      />
      <ModuleBlock title="What to remember">
        <p>
          Analyze measures. Preview does not save. A cleaned version is new. The original
          stays.
        </p>
      </ModuleBlock>
      <div className="flex flex-wrap gap-2">
        <ProductAction to="/overview?try=1" variant="primary">
          Try FACILIO
        </ProductAction>
        <ProductAction to="/datasets">Open Datasets</ProductAction>
      </div>
    </LearnModule>
  );
}
