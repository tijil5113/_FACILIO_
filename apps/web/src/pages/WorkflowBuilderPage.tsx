import { useParams } from "react-router";

import { WorkflowBuilder } from "@/features/workflows/WorkflowBuilder";

export function WorkflowBuilderPage() {
  const { workflowId } = useParams();
  if (!workflowId) {
    return null;
  }
  return <WorkflowBuilder workflowId={workflowId} />;
}
