import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/projects/")({
  component: ProjectsIndex,
});

function ProjectsIndex() {
  const { workspace } = Route.useParams();
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Projects</h2>
      <ul className="list-disc pl-4">
        <li>
          <Link to="/$workspace/projects/$projectId/timeline" params={{ workspace, projectId: "project-1" }}>
            Project 1
          </Link>
        </li>
        <li>
          <Link to="/$workspace/projects/$projectId/timeline" params={{ workspace, projectId: "project-2" }}>
            Project 2
          </Link>
        </li>
      </ul>
    </div>
  );
}
