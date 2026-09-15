import { Button } from "@/components/ui/Button";
import type { GuidedRecommendation } from "@/types/cleanup";

import { RecommendationCard } from "./RecommendationCard";
import type { PlanSelection } from "./plan-state";

interface RecommendationListProps {
  recommendations: GuidedRecommendation[];
  selections: Record<string, PlanSelection>;
  conflictById: Record<string, string>;
  selectedCount: number;
  actionableCount: number;
  onToggle: (id: string, selected: boolean) => void;
  onConfigure: (
    id: string,
    operation: string,
    parameters: Record<string, unknown>,
  ) => void;
  onSelectSafe: () => void;
  onClear: () => void;
}

export function RecommendationList({
  recommendations,
  selections,
  conflictById,
  selectedCount,
  actionableCount,
  onToggle,
  onConfigure,
  onSelectSafe,
  onClear,
}: RecommendationListProps) {
  const actionable = recommendations.filter((item) => item.kind === "actionable");
  const informational = recommendations.filter((item) => item.kind === "informational");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary" role="status">
          {selectedCount} of {actionableCount} cleanup steps selected
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onSelectSafe}>
            Select safe fixes
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Deselect all
          </Button>
        </div>
      </div>
      {actionable.length > 0 ? (
        <section className="space-y-3" aria-labelledby="actionable-fixes">
          <h2 id="actionable-fixes" className="text-sm font-medium text-ink">
            Suggested fixes
          </h2>
          {actionable.map((item) => (
            <RecommendationCard
              key={item.recommendation_id}
              recommendation={item}
              selection={selections[item.recommendation_id]}
              disabledReason={conflictById[item.recommendation_id]}
              onToggle={onToggle}
              onConfigure={onConfigure}
            />
          ))}
        </section>
      ) : null}
      {informational.length > 0 ? (
        <section className="space-y-3" aria-labelledby="informational-findings">
          <h2 id="informational-findings" className="text-sm font-medium text-ink">
            Worth reviewing
          </h2>
          <p className="text-sm text-ink-secondary">
            FACILIO found these, but it doesn’t have a safe guided cleanup for them.
          </p>
          {informational.map((item) => (
            <RecommendationCard
              key={item.recommendation_id}
              recommendation={item}
              onToggle={onToggle}
              onConfigure={onConfigure}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
