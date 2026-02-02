import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAppUserId, assertWorkspaceMember, assertWorkspaceAdmin } from "./lib/auth";
import { deleteProject } from "./lib/deletion";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all projects in a workspace.
 */
export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

/**
 * Get a single project by ID.
 */
export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new project in a workspace.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    await assertWorkspaceMember(ctx, args.workspaceId, userId);

    const projectId = await ctx.db.insert("projects", {
      workspaceId: args.workspaceId,
      name: args.name,
      description: args.description,
      status: "active",
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: Date.now(),
      createdBy: userId,
    });
    return projectId;
  },
});

/**
 * Update an existing project.
 */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await assertWorkspaceMember(ctx, project.workspaceId, userId);

    const { projectId, ...updates } = args;

    if (Object.values(updates).some((v) => v !== undefined)) {
      await ctx.db.patch(projectId, updates);
    }
    return projectId;
  },
});

/**
 * Archive a project (soft delete).
 */
export const archive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await assertWorkspaceMember(ctx, project.workspaceId, userId);

    await ctx.db.patch(args.projectId, { status: "archived" });
    return args.projectId;
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await assertWorkspaceAdmin(ctx, project.workspaceId, userId);

    await deleteProject(ctx, args.projectId);
    
    return args.projectId;
  },
});

/**
 * Ensure at least one project and phase exists in a workspace.
 */
export const ensureDefaultProjectAndPhase = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    await assertWorkspaceMember(ctx, args.workspaceId, userId);

    // Check for existing projects
    const existingProject = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();

    if (existingProject) {
      // Check for phases in this project
      const existingPhase = await ctx.db
        .query("phases")
        .withIndex("by_project", (q) => q.eq("projectId", existingProject._id))
        .first();

      if (existingPhase) {
        return { projectId: existingProject._id, phaseId: existingPhase._id };
      }

      // Create a default phase if none exists
      const phaseId = await ctx.db.insert("phases", {
        projectId: existingProject._id,
        name: "General",
        order: 0,
      });
      return { projectId: existingProject._id, phaseId };
    }

    // Create a default project
    const projectId = await ctx.db.insert("projects", {
      workspaceId: args.workspaceId,
      name: "General Project",
      status: "active",
      createdAt: Date.now(),
      createdBy: userId,
    });

    // Create a default phase
    const phaseId = await ctx.db.insert("phases", {
      projectId,
      name: "General",
      order: 0,
    });

    return { projectId, phaseId };
  },
});

