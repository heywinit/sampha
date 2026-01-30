import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/calendar")({
  component: WorkspaceCalendar,
});

function WorkspaceCalendar() {
  return <div>Workspace Calendar</div>;
}
