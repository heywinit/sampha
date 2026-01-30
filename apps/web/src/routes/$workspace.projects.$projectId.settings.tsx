import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/projects/$projectId/settings")({
  component: ProjectSettings,
});

function ProjectSettings() {
  return <div>Project Settings</div>;
}
