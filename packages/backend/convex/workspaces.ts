import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAppUserId, assertWorkspaceAdmin } from "./lib/auth";
import { deleteProject } from "./lib/deletion";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return [];
    }

    // Find the user in the main 'users' table by email
    // Use the combined index and pick the most recent non-deleted user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email_active", (q) => q.eq("email", identity.email!).eq("isDeleted", false))
      .order("desc") // Most recent first
      .first();

    if (!user) {
      return [];
    }

    // Get all workspace memberships for this user
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get the workspaces
    const workspaces = await Promise.all(
      memberships.map(async (member) => {
        const workspace = await ctx.db.get(member.workspaceId);
        return workspace ? { ...workspace, role: member.role } : null;
      }),
    );
    return workspaces.filter((w) => w !== null);
  },
});

// ============================================================================
// QUERIES
// ============================================================================
/**
 * Get a workspace by ID.
 */
export const get = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workspaceId);
  },
});

/**
 * Get a workspace by slug.
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/**
 * List members of a workspace.
 */
export const listMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Enrich with user data
    const enrichedMembers = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { ...m, user };
      }),
    );

    return enrichedMembers;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new workspace.
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal("private"), v.literal("shared")),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);

    // Check if slug is already taken
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error("Workspace slug already exists");
    }

    // Create the workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      slug: args.slug,
      type: args.type,
      createdAt: Date.now(),
      createdBy: userId,
    });

    // Add the creator as an admin
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "admin",
      joinedAt: Date.now(),
    });

    return workspaceId;
  },
});

/**
 * Update a workspace (admin only).
 */
export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    await assertWorkspaceAdmin(ctx, args.workspaceId, userId);

    const { workspaceId, ...updates } = args;

    // If updating slug, check uniqueness
    if (updates.slug) {
      const existing = await ctx.db
        .query("workspaces")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug as string))
        .unique();

      if (existing && existing._id !== workspaceId) {
        throw new Error("Workspace slug already exists");
      }
    }

    if (Object.values(updates).some((v) => v !== undefined)) {
      await ctx.db.patch(workspaceId, updates);
    }

    return workspaceId;
  },
});

/**
 * Delete a workspace (admin only).
 */
export const remove = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);
    await assertWorkspaceAdmin(ctx, args.workspaceId, userId);

    const workspaceId = args.workspaceId;

    // 1. Get all related entities in parallel
    const [members, projects, notifications, githubConnections, statusConfigs, states] =
      await Promise.all([
        ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .collect(),
        ctx.db
          .query("projects")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .collect(),
        ctx.db
          .query("notifications")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .collect(),
        ctx.db
          .query("githubConnections")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .collect(),
        ctx.db
          .query("statusConfigs")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .collect(),
        ctx.db
          .query("userWorkspaceStates")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .collect(),
      ]);

    // 2. Delete all entities in parallel
    await Promise.all([
      ...members.map((member) => ctx.db.delete(member._id)),
      ...projects.map((project) => deleteProject(ctx, project._id)),
      ...notifications.map((notification) => ctx.db.delete(notification._id)),
      ...githubConnections.map((conn) => ctx.db.delete(conn._id)),
      ...statusConfigs.map((config) => ctx.db.delete(config._id)),
      ...states.map((state) => ctx.db.delete(state._id)),
    ]);

    await ctx.db.delete(workspaceId);
    return workspaceId;
  },
});

/**
 * Add a member to a workspace.
 */
export const addMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAppUserId(ctx);
    await assertWorkspaceAdmin(ctx, args.workspaceId, currentUserId);

    // Check if already a member
    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      throw new Error("User is already a member of this workspace");
    }

    const memberId = await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      role: args.role,
      joinedAt: Date.now(),
    });

    return memberId;
  },
});

/**
 * Remove a member from a workspace (admin only).
 */
export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAppUserId(ctx);
    await assertWorkspaceAdmin(ctx, args.workspaceId, currentUserId);

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this workspace");
    }

    await ctx.db.delete(membership._id);
    return membership._id;
  },
});

/**
 * Update a member's role (admin only).
 */
export const updateMemberRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAppUserId(ctx);
    await assertWorkspaceAdmin(ctx, args.workspaceId, currentUserId);

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this workspace");
    }

    await ctx.db.patch(membership._id, { role: args.role });
    return membership._id;
  },
});

// ============================================================================
// HELPERS
// ============================================================================
