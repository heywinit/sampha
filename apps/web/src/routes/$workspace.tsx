import * as React from "react";
import { createFileRoute, Outlet, useLocation, Link } from "@tanstack/react-router";
import { FloatingNav } from "@/components/layout/floating-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const Route = createFileRoute("/$workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspace } = Route.useParams();
  const location = useLocation();

  // Simple Breadcrumb Logic
  // pathSegments: ["timeline"] or ["projects", "projectc-1", "timeline"]
  // We want to skip the workspace part since it's the root breadcrumb
  const pathSegments = location.pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== workspace);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <FloatingNav />

      <main className="min-h-screen w-full p-6 pl-[88px] transition-[padding] duration-300 ease-in-out">
        <header className="mb-4 flex items-center h-14">
          <Breadcrumb className="w-full border p-4 rounded-2xl">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/${workspace}`} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {workspace}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {pathSegments.map((segment, index) => {
                const isLast = index === pathSegments.length - 1;
                // Construct path up to this segment
                // This is a bit naive but works for the current flat route structure if segments are unique enough
                // A more robust way would be to rebuild the path cumulatively
                const path = `/${workspace}/${pathSegments.slice(0, index + 1).join("/")}`;

                return (
                  <React.Fragment key={segment}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="capitalize">
                          {segment.replace(/-/g, " ")}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={path} className="capitalize">
                            {segment.replace(/-/g, " ")}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
