import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/projects/$projectId/")({
  component: ProjectIndex,
});

function ProjectIndex() {
  const { workspace, projectId } = Route.useParams();
  return <Navigate to="/$workspace/projects/$projectId/timeline" params={{ workspace, projectId }} />;
}
