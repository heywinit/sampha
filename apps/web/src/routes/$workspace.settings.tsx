import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/settings")({
  component: WorkspaceSettings,
});

function WorkspaceSettings() {
  return <div>Workspace Settings</div>;
}
