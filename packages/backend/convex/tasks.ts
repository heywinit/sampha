import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAppUserId, assertWorkspaceMember } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all tasks in a workspace.
 */
export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

/**
 * Get a single task by ID.
 */
export const get = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new task.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    phaseId: v.id("phases"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    startDate: v.number(),
    dueDate: v.number(),
    priority: v.optional(v.string()),
    assigneeIds: v.optional(v.array(v.id("users"))),
    watcherIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    await assertWorkspaceMember(ctx, args.workspaceId, userId);

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      assigneeIds: args.assigneeIds ?? [],
      watcherIds: args.watcherIds ?? [],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return taskId;
  },
});

/**
 * Update an existing task.
 */
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.string()),
    assigneeIds: v.optional(v.array(v.id("users"))),
    watcherIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    await assertWorkspaceMember(ctx, task.workspaceId, userId);

    const { taskId: _, ...updates } = args;
    
    await ctx.db.patch(args.taskId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return args.taskId;
  },
});

/**
 * Delete a task.
 */
export const remove = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    await assertWorkspaceMember(ctx, task.workspaceId, userId);

    // TODO: Ideally handle related subtasks, comments etc. 
    // But for now, simple delete.
    await ctx.db.delete(args.taskId);
    return args.taskId;
  },
});
