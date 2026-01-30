import { createFileRoute, Outlet, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspace } = Route.useParams();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 border-b flex gap-4">
        <h1 className="font-bold">Workspace: {workspace}</h1>
        <nav className="flex gap-4">
          <Link to="/$workspace/timeline" params={{ workspace }} className="[&.active]:font-bold">Timeline</Link>
          <Link to="/$workspace/calendar" params={{ workspace }} className="[&.active]:font-bold">Calendar</Link>
          <Link to="/$workspace/inbox" params={{ workspace }} className="[&.active]:font-bold">Inbox</Link>
          <Link to="/$workspace/projects" params={{ workspace }} className="[&.active]:font-bold">Projects</Link>
          <Link to="/$workspace/settings" params={{ workspace }} className="[&.active]:font-bold">Settings</Link>
        </nav>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
