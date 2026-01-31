import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, getAppUserId, getAppUserIdOrNull } from "./lib/auth";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current authenticated user from the main users table.
 */
export const me = query({
  handler: async (ctx) => {
    const userId = await getAppUserIdOrNull(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * Get a user by ID.
 */
export const get = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * List all users (for workspace member selection, etc.)
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Sync the authenticated user from betterAuth to the main users table.
 * Creates a new user if they don't exist, or updates if they do.
 */
export const syncFromAuth = mutation({
  handler: async (ctx) => {
    const authUser = await getAuthUser(ctx);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: authUser.name,
        avatarUrl: authUser.image ?? undefined,
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: authUser.name,
      email: authUser.email,
      avatarUrl: authUser.image ?? undefined,
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Update user profile.
 */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAppUserId(ctx);

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }

    return userId;
  },
});

/**
 * Delete user account.
 */
export const remove = mutation({
  handler: async (ctx) => {
    const userId = await getAppUserId(ctx);
    await ctx.db.delete(userId);
    return userId;
  },
});
