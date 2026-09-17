import { Callout } from "@/components/ui/Callout";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";

import { ExampleTable } from "../ExampleTable";
import { LearnModule } from "../LearnModule";
import { ModuleBlock } from "../ModuleBlock";
import { ProductAction } from "../ProductAction";

export function UnderstandDatasetModule() {
  return (
    <LearnModule id="data" eyebrow="3" title="Understand your dataset">
      <ModuleBlock title="What this is">
        <p>
          A dataset is one uploaded source plus every version created from it. After
          upload you work with a dataset, not a one-off file.
        </p>
      </ModuleBlock>
      <ExampleTable
        caption="Rows are records. Columns are fields."
        columns={["name", "status", "age"]}
        rows={[
          ["Alice", "ACTIVE", "34"],
          ["Bob", "active", "Missing"],
        ]}
      />
      <ModuleBlock title="What Analyze does">
        <p>
          FACILIO examines measurable properties of the selected version: structure,
          inferred types, missing values, duplicate rows, and supported validity or
          consistency checks.
        </p>
        <p>
          Analysis does not rewrite values. FACILIO can see that age is missing. It cannot
          know whether the correct age should have been 34.
        </p>
      </ModuleBlock>
      <Callout tone="neutral" title="Not business truth">
        Analysis is not a statement that the data is correct for its real-world purpose.
      </Callout>
      <TechnicalDetails>
        <p>
          Analyze creates a profile snapshot for a DatasetVersion. It records row and
          column counts, missing cells, duplicate full-row tuples, inferred types, and
          quality dimensions.
        </p>
      </TechnicalDetails>
      <ProductAction to="/datasets">Open Datasets</ProductAction>
    </LearnModule>
  );
}
