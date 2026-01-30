import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/projects/$projectId/timeline")({
  component: ProjectTimeline,
});

function ProjectTimeline() {
  return <div>Project Timeline</div>;
}
