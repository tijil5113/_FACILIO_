import { Callout } from "@/components/ui/Callout";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { CONCEPTS } from "@/features/education/concepts";

import { LearnModule } from "../LearnModule";
import { ModuleBlock } from "../ModuleBlock";
import { ProductAction } from "../ProductAction";

const STATUSES = [
  { label: "Waiting", body: CONCEPTS.activity.waiting },
  { label: "Running", body: CONCEPTS.activity.running },
  { label: "Completed", body: CONCEPTS.activity.completed },
  { label: "Needs attention", body: CONCEPTS.activity.needsAttention },
] as const;

export function ActivityModule() {
  return (
    <LearnModule id="activity" eyebrow="9" title="Follow Activity">
      <ModuleBlock title="What this is">
        <p>{CONCEPTS.activity.summary}</p>
      </ModuleBlock>
      <ul className="grid gap-3 sm:grid-cols-2">
        {STATUSES.map((status) => (
          <li
            key={status.label}
            className="rounded-[var(--facilio-radius-md)] border border-line bg-surface px-4 py-3"
          >
            <p className="text-sm font-medium text-ink">{status.label}</p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">{status.body}</p>
          </li>
        ))}
      </ul>
      <Callout tone="warning" title="Cleanup can succeed while analysis needs attention">
        {CONCEPTS.activity.partialSuccess}
      </Callout>
      <ModuleBlock title="Failed before output">
        <p>{CONCEPTS.activity.failedBeforeOutput}</p>
      </ModuleBlock>
      <TechnicalDetails>
        <p>
          Activity is a Job. The domain record of one execution is a WorkflowRun.
          Attempts, workers, and heartbeats live in Technical details. You do not need
          those identifiers for ordinary work.
        </p>
      </TechnicalDetails>
      <ProductAction to="/jobs" variant="primary">
        View Activity
      </ProductAction>
    </LearnModule>
  );
}
