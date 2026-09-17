import { Callout } from "@/components/ui/Callout";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { CONCEPTS } from "@/features/education/concepts";

import { BeforeAfterExample } from "../BeforeAfterExample";
import { ComposedPreviewExample } from "../ComposedPreviewExample";
import { LearnModule } from "../LearnModule";
import { ModuleBlock } from "../ModuleBlock";
import { ProcessDiagram } from "../ProcessDiagram";
import { ProductAction } from "../ProductAction";

export function CleaningModule() {
  return (
    <LearnModule id="cleaning" eyebrow="6" title="Clean safely">
      <ModuleBlock title="What this is">
        <p>{CONCEPTS.cleaning.summary}</p>
      </ModuleBlock>
      <ProcessDiagram
        label="Safe cleaning sequence"
        steps={["Review", "Choose", "Preview", "Create"]}
      />
      <Callout tone="info" title="Original stays">
        FACILIO does not silently overwrite the current or original version. Approval
        creates another version.
      </Callout>
      <BeforeAfterExample />
      <ModuleBlock title="Composed preview">
        <p>{CONCEPTS.cleaning.order}</p>
      </ModuleBlock>
      <ComposedPreviewExample />
      <TechnicalDetails>
        <p>
          Clean applies registered deterministic transformations. Preview is ephemeral.
          Apply writes a new DatasetVersion. Operation codes remain in Technical details
          and APIs.
        </p>
      </TechnicalDetails>
      <ProductAction to="/overview?try=1">Try FACILIO</ProductAction>
    </LearnModule>
  );
}
