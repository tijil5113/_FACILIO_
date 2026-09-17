import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { CONCEPTS } from "@/features/education/concepts";

import { BranchingIllustration } from "../VersionDiagram";
import { LearnModule } from "../LearnModule";
import { LineageDiagram } from "../LineageDiagram";
import { ModuleBlock } from "../ModuleBlock";
import { ProductAction } from "../ProductAction";

export function VersionsModule() {
  return (
    <LearnModule id="versions" eyebrow="7" title="Understand versions">
      <ModuleBlock title="What this is">
        <p>{CONCEPTS.versions.original}</p>
        <p>{CONCEPTS.versions.cleaned}</p>
      </ModuleBlock>
      <LineageDiagram />
      <ModuleBlock title="Viewing versus Using">
        <p>
          <strong className="font-medium text-ink">Viewing</strong> is the version on
          screen.
        </p>
        <p>
          <strong className="font-medium text-ink">Using</strong> is the working default.
          History can switch it with Use this version. That does not delete other
          versions.
        </p>
        <p>{CONCEPTS.versions.summary}</p>
      </ModuleBlock>
      <details className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Branching versions
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-ink-secondary">
            You can create a new version from an older version. Later versions stay
            available. This is not Git.
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
      <ProductAction to="/overview?try=1">Try FACILIO</ProductAction>
    </LearnModule>
  );
}
