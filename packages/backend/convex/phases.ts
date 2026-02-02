import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAppUserId, assertWorkspaceMember } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all phases for a project.
 */
export const list = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phases")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new phase.
 */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await assertWorkspaceMember(ctx, project.workspaceId, userId);

    const phaseId = await ctx.db.insert("phases", args);
    return phaseId;
  },
});
