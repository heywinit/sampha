import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/projects/$projectId/kanban")({
  component: ProjectKanban,
});

function ProjectKanban() {
  return <div>Project Kanban</div>;
}
