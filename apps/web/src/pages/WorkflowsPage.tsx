import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import {
  useCreateWorkflowMutation,
  useWorkflowsQuery,
} from "@/features/workflows/queries";
import { FirstUseCue } from "@/features/onboarding/FirstUseCue";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { formatDateTime } from "@/lib/format";
import { jobStatusLabel, workflowStatusLabel } from "@/lib/status-labels";
import type { WorkflowStatus } from "@/types/workflows";

const statusTone: Record<WorkflowStatus, "success" | "danger" | "warning" | "neutral"> = {
  READY: "success",
  INVALID: "danger",
  DRAFT: "warning",
  ARCHIVED: "neutral",
};

export function WorkflowsPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const list = useWorkflowsQuery(page);
  const create = useCreateWorkflowMutation();
  const navigate = useNavigate();
  const data = list.data;
  const empty = data && data.total === 0;

  const createButton = (
    <Button
      onClick={() => {
        setCreateOpen(true);
      }}
    >
      New cleanup
    </Button>
  );

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      <FirstUseCue cue="cleanups" title="Saved cleanups">
        Cleanups let you reuse a set of steps.
      </FirstUseCue>
      {list.isLoading ? (
        <div aria-busy="true" className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : list.isError ? (
        <Callout tone="danger" title="Cleanups unavailable">
          Saved Cleanups could not be loaded. Nothing was changed.
        </Callout>
      ) : empty ? (
        <EmptyState
          title="Cleanups"
          summary="Save cleanup steps and use them again on matching data."
          detail="A cleanup is a list of steps you can run later. Your original dataset stays unchanged; a successful run creates a new version."
          visual={
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-secondary">Saved cleanups</p>
                {createButton}
              </div>
              <p className="text-sm text-ink-muted">No saved cleanups yet</p>
            </div>
          }
        >
          <p className="mt-4">
            <LearnMoreLink to="/learn#cleanups">What is a Cleanup?</LearnMoreLink>
          </p>
        </EmptyState>
      ) : (
        <>
          <PageHeader
            title="Cleanups"
            description="Save cleanup steps and use them again on matching data."
            actions={createButton}
          />
          <p>
            <LearnMoreLink to="/learn#cleanups">What is a Cleanup?</LearnMoreLink>
          </p>
          <div className="overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Saved cleanups</caption>
              <thead className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Cleanup</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Steps</th>
                  <th className="px-4 py-2 font-medium">Last run</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id} className="border-t border-line hover:bg-subtle">
                    <td className="px-4 py-3">
                      <Link
                        to={`/workflows/${item.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[item.status]}>
                        {workflowStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {item.enabled_step_count}/{item.step_count}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {item.last_run_status ? jobStatusLabel(item.last_run_status) : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {formatDateTime(item.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.total > data.page_size ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((value) => value - 1);
                }}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * data.page_size >= data.total}
                onClick={() => {
                  setPage((value) => value + 1);
                }}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
      <Dialog
        open={createOpen}
        title="New cleanup"
        onClose={() => {
          setCreateOpen(false);
        }}
      >
        <form
          className="space-y-3 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(
              { name: name.trim(), description: description.trim() || null },
              {
                onSuccess: (workflow) => {
                  setCreateOpen(false);
                  setName("");
                  setDescription("");
                  void navigate(`/workflows/${workflow.id}`);
                },
              },
            );
          }}
        >
          <h2 className="text-base font-semibold text-ink">New cleanup</h2>
          <Input
            id="workflow-name"
            label="Name"
            value={name}
            required
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          <Input
            id="workflow-description"
            label="Description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
          />
          <TechnicalDetails>
            <p>
              This creates a Cleanup. You add steps next. Running it later creates a new
              dataset version and does not overwrite the original.
            </p>
          </TechnicalDetails>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setCreateOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? "Creating…" : "Create cleanup"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
