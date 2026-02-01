import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Thoroughly deletes a task and all its related entities.
 */
export async function deleteTask(ctx: MutationCtx, taskId: Id<"tasks">) {
  // 1. Delete subtasks
  const subtasks = await ctx.db
    .query("subtasks")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  await Promise.all(subtasks.map((s) => ctx.db.delete(s._id)));

  // 2. Delete comments
  const comments = await ctx.db
    .query("comments")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  await Promise.all(comments.map((c) => ctx.db.delete(c._id)));

  // 3. Delete task dependencies (both directions)
  const dependenciesFrom = await ctx.db
    .query("taskDependencies")
    .withIndex("by_from_task", (q) => q.eq("fromTaskId", taskId))
    .collect();
  const dependenciesTo = await ctx.db
    .query("taskDependencies")
    .withIndex("by_to_task", (q) => q.eq("toTaskId", taskId))
    .collect();

  await Promise.all([...dependenciesFrom, ...dependenciesTo].map((dep) => ctx.db.delete(dep._id)));

  // 4. Delete GitHub Links & External Comments
  const githubLinks = await ctx.db
    .query("githubLinks")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();

  const externalComments = (
    await Promise.all(
      githubLinks.map((link) =>
        ctx.db
          .query("externalComments")
          .withIndex("by_github_link", (q) => q.eq("githubLinkId", link._id))
          .collect(),
      ),
    )
  ).flat();

  await Promise.all([
    ...externalComments.map((comment) => ctx.db.delete(comment._id)),
    ...githubLinks.map((link) => ctx.db.delete(link._id)),
  ]);

  // 5. Delete task activities
  const taskActivities = await ctx.db
    .query("activities")
    .withIndex("by_entity", (q) => q.eq("entityId", taskId))
    .collect();
  await Promise.all(taskActivities.map((activity) => ctx.db.delete(activity._id)));

  // 6. Delete the task itself
  await ctx.db.delete(taskId);
}

/**
 * Thoroughly deletes a project and all its related entities (phases, tasks, etc.).
 */
export async function deleteProject(ctx: MutationCtx, projectId: Id<"projects">) {
  // 1. Delete phases and their activities
  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  const phaseActivities = (
    await Promise.all(
      phases.map((phase) =>
        ctx.db
          .query("activities")
          .withIndex("by_entity", (q) => q.eq("entityId", phase._id))
          .collect(),
      ),
    )
  ).flat();

  await Promise.all([
    ...phaseActivities.map((activity) => ctx.db.delete(activity._id)),
    ...phases.map((phase) => ctx.db.delete(phase._id)),
  ]);

  // 2. Delete project activities
  const projectActivities = await ctx.db
    .query("activities")
    .withIndex("by_entity", (q) => q.eq("entityId", projectId))
    .collect();

  await Promise.all(projectActivities.map((activity) => ctx.db.delete(activity._id)));

  // 3. Delete tasks and their related data
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  await Promise.all(tasks.map((task) => deleteTask(ctx, task._id)));

  // 4. Delete the project itself
  await ctx.db.delete(projectId);
}
