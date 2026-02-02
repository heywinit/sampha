import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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
    return await ctx.db
      .query("users")
      .withIndex("by_isDeleted", (q) => q.eq("isDeleted", false))
      .collect();
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
    // Use the combined index and pick the most recent non-deleted user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email_active", (q) => q.eq("email", authUser.email).eq("isDeleted", false))
      .order("desc")
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: authUser.name,
        avatarUrl: authUser.image ?? undefined,
        isDeleted: false,
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: authUser.name,
      email: authUser.email,
      avatarUrl: authUser.image ?? undefined,
      isDeleted: false,
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

    if (Object.values(args).some((v) => v !== undefined)) {
      await ctx.db.patch(userId, args);
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
    await ctx.db.patch(userId, { isDeleted: true });
    return userId;
  },
});

/**
 * Internal mutation to process a batch of users for backfilling isDeleted.
 */
export const batchBackfillIsDeleted = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), limit: v.number() },
  handler: async (ctx, args) => {
    const { page, continueCursor, isDone } = await ctx.db
      .query("users")
      .paginate({ cursor: args.cursor, numItems: args.limit });

    let updatedCount = 0;
    for (const user of page) {
      if (user.isDeleted === undefined) {
        await ctx.db.patch(user._id, { isDeleted: false });
        updatedCount++;
      }
    }
    return { updatedCount, continueCursor, isDone, totalCount: page.length };
  },
});

/**
 * Backfill action to ensure all users have the isDeleted field set.
 * Uses batching to handle large datasets robustly.
 */
export const backfillIsDeleted = action({
  handler: async (ctx) => {
    let totalUpdated = 0;
    let cursor: string | null = null;
    let isDone = false;

    while (!isDone) {
      const result: {
        updatedCount: number;
        continueCursor: string;
        isDone: boolean;
      } = await ctx.runMutation(internal.users.batchBackfillIsDeleted, {
        cursor,
        limit: 100,
      });

      totalUpdated += result.updatedCount;
      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    return { totalUpdated };
  },
});
