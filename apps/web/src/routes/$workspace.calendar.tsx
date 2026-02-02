import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@sampha/backend/convex/_generated/api";
import type { Id } from "@sampha/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { useMemo } from "react";

import {
  type CalendarEvent,
  EventCalendar,
} from "@/components";

export const Route = createFileRoute("/$workspace/calendar")({
  component: WorkspaceCalendar,
});

function WorkspaceCalendar() {
  const { workspace: slug } = useParams({ from: "/$workspace/calendar" });
  
  // Fetch workspace by slug
  const workspace = useQuery(api.workspaces.getBySlug, { slug });
  
  // Fetch tasks for the workspace
  const tasks = useQuery(
    (api as any).tasks.list, 
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  const createTask = useMutation((api as any).tasks.create);
  const updateTask = useMutation((api as any).tasks.update);
  const removeTask = useMutation((api as any).tasks.remove);
  const ensureProjectAndPhase = useMutation(api.projects.ensureDefaultProjectAndPhase);

  // Map Convex tasks to CalendarEvent format
  const events = useMemo(() => {
    if (!tasks) return [];
    return (tasks as any[]).map((task: any) => ({
      id: task._id,
      title: task.title,
      description: task.description,
      start: new Date(task.startDate),
      end: new Date(task.dueDate),
      allDay: task.startDate === task.dueDate,
      status: task.status,
      priority: task.priority,
      color: task.color as any,
      location: task.location,
    })) as CalendarEvent[];
  }, [tasks]);

  const handleEventAdd = async (event: CalendarEvent) => {
    if (!workspace) return;
    
    try {
      // Ensure we have a project and phase
      const { projectId, phaseId } = await ensureProjectAndPhase({ workspaceId: workspace._id });

      await createTask({
        workspaceId: workspace._id,
        projectId,
        phaseId,
        title: event.title,
        description: event.description,
        status: event.status,
        startDate: event.start.getTime(),
        dueDate: event.end.getTime(),
        priority: event.priority,
        color: event.color,
        location: event.location,
      });
      toast.success("Task created");
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleEventUpdate = async (updatedEvent: CalendarEvent) => {
    try {
      await updateTask({
        taskId: updatedEvent.id as Id<"tasks">,
        title: updatedEvent.title,
        description: updatedEvent.description,
        startDate: updatedEvent.start.getTime(),
        dueDate: updatedEvent.end.getTime(),
        status: updatedEvent.status,
        priority: updatedEvent.priority,
        color: updatedEvent.color,
        location: updatedEvent.location,
      });
      toast.success("Task updated");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      await removeTask({ taskId: eventId as Id<"tasks"> });
      toast.success("Task deleted");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  if (!workspace) {
    return <div className="p-6 text-muted-foreground italic">Loading workspace...</div>;
  }

  return (
    <div className="h-full">
      <EventCalendar
        events={events}
        onEventAdd={handleEventAdd}
        onEventDelete={handleEventDelete}
        onEventUpdate={handleEventUpdate}
      />
    </div>
  );
}
