import { Badge } from "@/components/ui/Badge";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { formatCount } from "@/lib/format";
import { operationDisplayName } from "@/lib/operation-labels";
import type { GuidedRecommendation } from "@/types/cleanup";

import { asText, impactLabel, type PlanSelection } from "./plan-state";

interface RecommendationCardProps {
  recommendation: GuidedRecommendation;
  selection?: PlanSelection;
  disabledReason?: string | null;
  onToggle: (id: string, selected: boolean) => void;
  onConfigure: (
    id: string,
    operation: string,
    parameters: Record<string, unknown>,
  ) => void;
}

export function RecommendationCard({
  recommendation,
  selection,
  disabledReason,
  onToggle,
  onConfigure,
}: RecommendationCardProps) {
  const selected = Boolean(selection?.selected);
  const informational = recommendation.kind === "informational";
  const impact = impactLabel(recommendation.impact_level);
  const currentMode = asText(
    selection?.parameters.mode ?? recommendation.default_parameters.mode,
  );
  const currentStrategy =
    selection?.operation_code === "DROP_MISSING_ROWS"
      ? "drop_rows"
      : asText(
          selection?.parameters.strategy ?? recommendation.default_parameters.strategy,
        );

  return (
    <article
      className={`rounded-[var(--facilio-radius-md)] border px-4 py-4 transition-[border-color,background-color] duration-[var(--facilio-duration-fast)] ease-[var(--facilio-ease)] ${
        selected ? "border-ink bg-subtle" : "border-line bg-surface"
      } ${informational ? "opacity-95" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-ink">{recommendation.title}</h3>
            {impact ? (
              <Badge
                tone={recommendation.impact_level === "HIGH" ? "warning" : "neutral"}
              >
                {impact}
              </Badge>
            ) : (
              <Badge>Review</Badge>
            )}
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-secondary">
            {recommendation.explanation}
          </p>
          {recommendation.columns.length > 0 ? (
            <p className="mt-2 text-xs text-ink-muted">
              Column: {recommendation.columns.join(", ")}
            </p>
          ) : null}
          {recommendation.affected_count != null ? (
            <p className="text-xs text-ink-muted">
              Affected: {formatCount(recommendation.affected_count)}
              {recommendation.affected_count === 1 ? " row" : " rows"}
            </p>
          ) : null}
          {recommendation.suggested_cleanup ? (
            <p className="mt-2 text-sm text-ink">
              Suggested cleanup: {recommendation.suggested_cleanup}
              {currentMode ? ` · ${currentMode}` : ""}
            </p>
          ) : null}
          <p className="mt-1 text-xs leading-5 text-ink-muted">{recommendation.why}</p>
          {informational ? (
            <p className="mt-2 text-sm text-ink-secondary">
              FACILIO found this, but it doesn’t have a safe guided cleanup for it.
            </p>
          ) : null}
          {disabledReason ? (
            <p className="mt-2 text-sm text-warning" role="status">
              {disabledReason}
            </p>
          ) : null}
        </div>
        {informational ? null : (
          <label className="flex min-h-10 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected}
              disabled={Boolean(disabledReason) && !selected}
              aria-label={`Include ${recommendation.title}`}
              onChange={(event) => {
                onToggle(recommendation.recommendation_id, event.target.checked);
              }}
            />
            Selected
          </label>
        )}
      </div>
      {!informational && recommendation.options.length > 0 && selected ? (
        <fieldset className="mt-4 border-t border-line pt-3">
          <legend className="text-xs font-medium text-ink-secondary">
            Change option
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {recommendation.options.map((option) => {
              const active =
                option.operation_code === "DROP_MISSING_ROWS"
                  ? currentStrategy === "drop_rows"
                  : option.field === "mode"
                    ? currentMode === asText(option.value)
                    : currentStrategy === asText(option.value);
              return (
                <label
                  key={`${option.field}:${asText(option.value)}`}
                  className="text-sm text-ink"
                >
                  <input
                    type="radio"
                    className="mr-2"
                    name={`${recommendation.recommendation_id}-option`}
                    checked={active}
                    onChange={() => {
                      onConfigure(
                        recommendation.recommendation_id,
                        option.operation_code ?? recommendation.operation_code ?? "",
                        { ...option.parameters },
                      );
                    }}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
          {currentStrategy === "constant" ? (
            <label className="mt-3 block text-xs font-medium text-ink-secondary">
              Fill value
              <input
                className="mt-1 h-9 w-full max-w-xs rounded-[var(--facilio-radius-md)] border border-line bg-raised px-3 text-sm text-ink"
                value={asText(selection?.parameters.value)}
                onChange={(event) => {
                  onConfigure(recommendation.recommendation_id, "FILL_MISSING", {
                    ...(selection?.parameters ?? recommendation.default_parameters),
                    strategy: "constant",
                    value: event.target.value,
                  });
                }}
              />
            </label>
          ) : null}
        </fieldset>
      ) : null}
      <TechnicalDetails>
        <p>Issue: {recommendation.issue_code}</p>
        {recommendation.operation_code ? (
          <p>
            Operation: {operationDisplayName(recommendation.operation_code)} (
            {recommendation.operation_code})
          </p>
        ) : null}
        {recommendation.evidence.length > 0 ? (
          <p>Evidence: {recommendation.evidence.join(" · ")}</p>
        ) : null}
      </TechnicalDetails>
    </article>
  );
}
