import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/timeline")({
  component: WorkspaceTimeline,
});

function WorkspaceTimeline() {
  return <div>Workspace Timeline</div>;
}
