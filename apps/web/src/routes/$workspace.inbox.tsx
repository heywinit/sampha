import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/inbox")({
  component: WorkspaceInbox,
});

function WorkspaceInbox() {
  return <div>Workspace Inbox</div>;
}
