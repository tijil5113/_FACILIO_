export interface ExecutionStage {
  id: "requested" | "waiting" | "started" | "completed" | "failed";
  label: string;
  at: string;
}

export function executionStory(job: {
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  error_code?: string | null;
}): ExecutionStage[] {
  const stages: ExecutionStage[] = [
    { id: "requested", label: "Requested", at: job.queued_at },
  ];
  if (job.started_at) {
    stages.push({ id: "started", label: "Started", at: job.started_at });
  } else if (
    job.status === "FAILED" &&
    (job.error_code === "QUEUE_DISPATCH_FAILED" || job.error_code === "QUEUE_ORPHAN")
  ) {
    stages.push({
      id: "failed",
      label: "Failed to start",
      at: job.completed_at ?? job.queued_at,
    });
  } else if (job.status === "QUEUED") {
    stages.push({ id: "waiting", label: "Waiting", at: job.queued_at });
  }
  if (job.completed_at && job.status === "SUCCEEDED") {
    stages.push({ id: "completed", label: "Completed", at: job.completed_at });
  } else if (job.completed_at && job.status === "FAILED" && job.started_at) {
    stages.push({
      id: "failed",
      label: "Stopped before completion",
      at: job.completed_at,
    });
  } else if (job.completed_at && job.status === "CANCELLED") {
    stages.push({ id: "completed", label: "Cancelled", at: job.completed_at });
  }
  return stages;
}
