import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/projects/$projectId/tasks")({
  component: ProjectTasks,
});

function ProjectTasks() {
  return <div>Project Tasks</div>;
}
