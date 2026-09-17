import { Callout } from "@/components/ui/Callout";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { CONCEPTS } from "@/features/education/concepts";

import { ExampleTable } from "../ExampleTable";
import { LearnModule } from "../LearnModule";
import { ModuleBlock } from "../ModuleBlock";
import { ProductAction } from "../ProductAction";

export function BringDataModule() {
  return (
    <LearnModule id="bring" eyebrow="2" title="Bring in your data">
      <ModuleBlock title="What this is">
        <p>
          Upload a table FACILIO can read. Upload stores the original file. It does not
          clean values.
        </p>
      </ModuleBlock>
      <ModuleBlock title="What FACILIO accepts">
        <p>{CONCEPTS.limits.formats}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>CSV (UTF-8)</li>
          <li>Excel workbooks (.xlsx), including choosing a worksheet</li>
          <li>JSON as a list of objects</li>
        </ul>
        <p>{CONCEPTS.limits.size}</p>
      </ModuleBlock>
      <ExampleTable
        caption="A tiny educational table, not your data"
        columns={["name", "status"]}
        rows={[
          ['" Alice "', "ACTIVE"],
          ['"Bob"', "active"],
          ["Missing", "ACTIVE"],
        ]}
      />
      <Callout tone="neutral" title="Bounded on purpose">
        FACILIO is a local workspace for files within the configured size limit. It does
        not connect to cloud warehouses or arbitrary file types.
      </Callout>
      <TechnicalDetails>
        <p>
          Ingestion creates a Dataset with V1 Original. Excel may ask you to pick a sheet
          before the dataset exists. JSON must be tabular.
        </p>
      </TechnicalDetails>
      <div className="flex flex-wrap gap-2">
        <ProductAction to="/datasets?upload=1" variant="primary">
          Open Datasets
        </ProductAction>
        <ProductAction to="/overview?try=1">Try FACILIO</ProductAction>
      </div>
    </LearnModule>
  );
}
