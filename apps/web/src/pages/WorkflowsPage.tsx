import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import {
  useCreateWorkflowMutation,
  useWorkflowsQuery,
} from "@/features/workflows/queries";
import { FirstUseCue } from "@/features/onboarding/FirstUseCue";
import { LearnMoreLink } from "@/features/learn/LearnMoreLink";
import { activityStatusLabel } from "@/lib/activity-outcome";
import { formatRelativeTime } from "@/lib/format";
import { workflowStatusLabel } from "@/lib/status-labels";
import type { WorkflowStatus } from "@/types/workflows";

const statusTone: Record<WorkflowStatus, string> = {
  READY: "text-ink",
  INVALID: "text-warning",
  DRAFT: "text-ink-muted",
  ARCHIVED: "text-ink-muted",
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
      New Cleanup
    </Button>
  );

  return (
    <div className="page-enter mx-auto content-page space-y-6">
      <FirstUseCue cue="cleanups" title="Saved Cleanups">
        A Cleanup is a saved set of cleaning steps you can use again.
      </FirstUseCue>
      {list.isLoading ? (
        <div aria-busy="true" className="space-y-4">
          <PageHeader
            title="Cleanups"
            description="Save cleaning steps you use repeatedly and apply them again when you need them."
            actions={createButton}
          />
          <TableSkeleton rows={6} />
        </div>
      ) : list.isError ? (
        <>
          <PageHeader
            title="Cleanups"
            description="Save cleaning steps you use repeatedly and apply them again when you need them."
          />
          <RecoveryMessage
            experience={mapRecoveryError(list.error, {
              operation: "load",
              action: "Load cleanups",
            })}
            actions={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void list.refetch();
                }}
              >
                Try again
              </Button>
            }
          />
        </>
      ) : empty ? (
        <EmptyState
          title="Cleanups"
          summary="Save cleaning steps you use repeatedly and apply them again when you need them."
          detail="No Cleanups yet. Save steps from Guided Cleanup or create a Cleanup to reuse them later."
          actions={
            <>
              {createButton}
              <ButtonLink variant="secondary" to="/datasets">
                Open a dataset
              </ButtonLink>
            </>
          }
        >
          <p>
            <LearnMoreLink to="/learn#cleanups">What is a Cleanup?</LearnMoreLink>
          </p>
        </EmptyState>
      ) : (
        <>
          <PageHeader
            title="Cleanups"
            description="Save cleaning steps you use repeatedly and apply them again when you need them."
            actions={createButton}
          />
          <Table caption="Saved Cleanups">
            <thead>
              <tr>
                <th>Cleanup</th>
                <th>Steps</th>
                <th>Last run</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={item.id} data-interactive="true">
                  <td className="max-w-[22rem] font-medium text-ink">
                    <Link
                      to={`/workflows/${item.id}`}
                      className="block truncate hover:underline focus-visible:underline"
                      title={item.name}
                    >
                      {item.name}
                    </Link>
                    <span
                      className={`type-caption mt-0.5 block ${statusTone[item.status]}`}
                    >
                      {workflowStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="tabular-nums text-ink-secondary">
                    {item.enabled_step_count}
                  </td>
                  <td className="text-ink-secondary">
                    {item.last_run_status
                      ? `${activityStatusLabel(item.last_run_status)}${
                          item.last_run_at
                            ? ` · ${formatRelativeTime(item.last_run_at)}`
                            : ""
                        }`
                      : "—"}
                  </td>
                  <td className="text-ink-secondary">
                    {formatRelativeTime(item.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
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
        title="New Cleanup"
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
          <h2 className="type-card-title text-ink">New Cleanup</h2>
          <p className="type-body-sm text-ink-secondary">
            Name this Cleanup, then add ordered cleaning steps.
          </p>
          <Input
            id="workflow-name"
            label="Name"
            value={name}
            required
            maxLength={200}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          <Textarea
            id="workflow-description"
            label="Description"
            value={description}
            maxLength={4000}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
          />
          {create.isError ? (
            <RecoveryMessage
              experience={mapRecoveryError(create.error, {
                operation: "save-cleanup",
                action: "Create cleanup",
              })}
            />
          ) : null}
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
              {create.isPending ? "Creating…" : "Create Cleanup"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
