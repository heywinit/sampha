import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAppUserId, assertWorkspaceAdmin } from "./lib/auth";

export const list = query({
   args: {},
    handler: async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity || !identity.email) {
        return [];
      }

      // Find the user in the main 'users' table by email
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .unique();

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

    // 1. Delete all workspace members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    await Promise.all(
      members.map((member) => ctx.db.delete(member._id)),
    );

    // 2. Delete all projects and their related data
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    await Promise.all(
      projects.map(async (project) => {
        // Delete phases
        const phases = await ctx.db
          .query("phases")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        for (const phase of phases) {
          await ctx.db.delete(phase._id);
        }

        // Delete user workspace states related to this project
        // Note: userWorkspaceStates are also deleted by workspaceId below,
        // but we might want to be thorough if they referenced specific projects.
        // However, the schema deletion by workspaceId covers the main userWorkspaceState entries.

        await ctx.db.delete(project._id);
      }),
    );
    
    // 3. Delete tasks and their related data
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
      
    await Promise.all(
      tasks.map(async (task) => {
        // Delete subtasks
        const subtasks = await ctx.db
          .query("subtasks")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();
        for (const subtask of subtasks) {
          await ctx.db.delete(subtask._id);
        }

        await ctx.db.delete(task._id);
      }),
    );

    // 4. Delete other direct children
    
    // Task Dependencies
    const taskDependencies = await ctx.db
        .query("taskDependencies")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    await Promise.all(
      taskDependencies.map((dep) => ctx.db.delete(dep._id)),
    );


    // Comments
    const comments = await ctx.db
        .query("comments")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    await Promise.all(
      comments.map((comment) => ctx.db.delete(comment._id)),
    );

    // Activities
    const activities = await ctx.db
        .query("activities")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    await Promise.all(
      activities.map((activity) => ctx.db.delete(activity._id)),
    );

    // Notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    await Promise.all(
      notifications.map((notification) => ctx.db.delete(notification._id)),
    );
    
    // Github Connections
    const githubConnections = await ctx.db
        .query("githubConnections")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    await Promise.all(
      githubConnections.map((conn) => ctx.db.delete(conn._id)),
    );
    
    // Github Links
    const githubLinks = await ctx.db
        .query("githubLinks")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    await Promise.all(
      githubLinks.map(async (link) => {
        // Delete external comments
        const externalComments = await ctx.db
          .query("externalComments")
          .withIndex("by_github_link", (q) => q.eq("githubLinkId", link._id))
          .collect();
        await Promise.all(
          externalComments.map((comment) => ctx.db.delete(comment._id)),
        );
        await ctx.db.delete(link._id);
      }),
    );

    // Status Configs
    const statusConfigs = await ctx.db
        .query("statusConfigs")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    await Promise.all(
      statusConfigs.map((config) => ctx.db.delete(config._id)),
    );
    
    // Cleanup UserWorkspaceStates - iterating over members we found earlier
    // Since we already have the list of members, we can try to find their states.
    await Promise.all(
      members.map(async (member) => {
        const states = await ctx.db
          .query("userWorkspaceStates")
          .withIndex("by_user_workspace", (q) =>
            q.eq("userId", member.userId).eq("workspaceId", workspaceId),
          )
          .collect();
        await Promise.all(states.map((state) => ctx.db.delete(state._id)));
      }),
    );

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

