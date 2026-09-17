import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import {
  humanStepFromWorkflow,
  stepConfigSummary,
} from "@/features/workflows/step-language";
import type { WorkflowStep } from "@/types/workflows";

interface CleaningStepsProps {
  steps: WorkflowStep[];
  selectedStepId: string | null;
  archived?: boolean;
  invalidStepIds?: Set<string>;
  stepMessages?: Record<string, string>;
  onSelect: (stepId: string) => void;
  onMove: (step: WorkflowStep, direction: -1 | 1) => void;
  onRemove: (stepId: string) => void;
}

export function CleaningSteps({
  steps,
  selectedStepId,
  archived = false,
  invalidStepIds,
  stepMessages,
  onSelect,
  onMove,
  onRemove,
}: CleaningStepsProps) {
  if (steps.length === 0) {
    return (
      <p className="type-body text-ink-muted">
        No cleaning steps yet. Add a step to start this Cleanup.
      </p>
    );
  }

  return (
    <ol className="cleaning-steps" aria-label="Cleaning steps">
      {steps.map((step, index) => {
        const selected = selectedStepId === step.id;
        const invalid = Boolean(step.enabled && invalidStepIds?.has(step.id));
        const message = stepMessages?.[step.id];
        return (
          <li key={step.id}>
            <div
              className="cleaning-step"
              data-selected={selected || undefined}
              data-invalid={invalid || undefined}
            >
              <span className="cleaning-step-index" aria-hidden="true">
                {String(index + 1)}
              </span>
              <button
                type="button"
                className="min-w-0 text-left"
                aria-current={selected ? "true" : undefined}
                onClick={() => {
                  onSelect(step.id);
                }}
              >
                <p className="text-sm font-medium text-ink">
                  {humanStepFromWorkflow(step)}
                </p>
                {stepConfigSummary(step.parameters) ? (
                  <p className="type-caption mt-1 text-ink-muted">
                    {stepConfigSummary(step.parameters)}
                  </p>
                ) : null}
                {!step.enabled ? (
                  <p className="type-caption mt-1 text-ink-muted">Skipped</p>
                ) : null}
                {message ? (
                  <p className="type-caption mt-1 text-danger" role="alert">
                    {message}
                  </p>
                ) : null}
              </button>
              <div className="flex items-center">
                <IconButton
                  label="Move step up"
                  disabled={index === 0 || archived}
                  onClick={() => {
                    onMove(step, -1);
                  }}
                >
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton
                  label="Move step down"
                  disabled={index === steps.length - 1 || archived}
                  onClick={() => {
                    onMove(step, 1);
                  }}
                >
                  <ArrowDown size={14} />
                </IconButton>
                <IconButton
                  label="Remove step"
                  disabled={archived}
                  onClick={() => {
                    onRemove(step.id);
                  }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
            {selected ? (
              <div className="px-3 pt-2">
                <TechnicalDetails summary="Technical step details">
                  <p>Operation: {step.operation_code}</p>
                  {Object.entries(step.parameters).map(([key, value]) => (
                    <p key={key}>
                      {key}: {formatParam(value)}
                    </p>
                  ))}
                </TechnicalDetails>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function formatParam(value: unknown): string {
  if (value == null) {
    return "—";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ") || "—";
  }
  return JSON.stringify(value);
}
