import { createFileRoute, Outlet, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/projects/$projectId")({
  component: ProjectLayout,
});

function ProjectLayout() {
  const { workspace, projectId } = Route.useParams();

  return (
    <div>
      <div className="flex border-b mb-4 gap-4 pb-2">
        <h2 className="font-bold text-lg">Project: {projectId}</h2>
        <nav className="flex gap-4">
          <Link to="/$workspace/projects/$projectId/timeline" params={{ workspace, projectId }} className="[&.active]:font-bold">Timeline</Link>
          <Link to="/$workspace/projects/$projectId/kanban" params={{ workspace, projectId }} className="[&.active]:font-bold">Kanban</Link>
          <Link to="/$workspace/projects/$projectId/tasks" params={{ workspace, projectId }} className="[&.active]:font-bold">Tasks</Link>
          <Link to="/$workspace/projects/$projectId/settings" params={{ workspace, projectId }} className="[&.active]:font-bold">Settings</Link>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
