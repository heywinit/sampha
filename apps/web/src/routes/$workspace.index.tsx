import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/")({
  component: WorkspaceIndex,
});

function WorkspaceIndex() {
  return <div>Workspace Home</div>;
}
