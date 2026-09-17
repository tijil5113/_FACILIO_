import { Callout } from "@/components/ui/Callout";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { CONCEPTS } from "@/features/education/concepts";

import { LearnModule } from "../LearnModule";
import { ModuleBlock } from "../ModuleBlock";
import { ProductAction } from "../ProductAction";
import { QualityDimensions } from "../QualityDimensions";
import { QualityExample } from "../QualityExample";

export function QualityModule() {
  return (
    <LearnModule id="quality" eyebrow="4" title="Understand data quality">
      <ModuleBlock title="What this is">
        <p>{CONCEPTS.quality.summary}</p>
      </ModuleBlock>
      <QualityDimensions />
      <Callout tone="neutral" title="Integrity is not assessed">
        {CONCEPTS.quality.integrity}
      </Callout>
      <ModuleBlock title="A measured example">
        <p>
          The numbers below follow FACILIO’s quality engine: complete cells over total
          cells, unique rows over row count, and an overall mean of assessed dimensions
          only.
        </p>
      </ModuleBlock>
      <QualityExample />
      <Callout tone="info" title="Not a correctness percentage">
        {CONCEPTS.quality.notAssessed} A higher score does not prove the data is right for
        your purpose.
      </Callout>
      <TechnicalDetails>
        <p>
          Assessed dimensions are completeness, uniqueness, validity, and consistency when
          their contracts apply. Integrity is always NOT_ASSESSED. Overall score uses
          equal weighting of assessed dimensions only.
        </p>
      </TechnicalDetails>
      <ProductAction to="/overview?try=1">Try FACILIO</ProductAction>
    </LearnModule>
  );
}
