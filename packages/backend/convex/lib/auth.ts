import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent, createAuth } from "../betterAuth/auth";

/**
 * Get the authenticated user from the context.
 * Throws an error if the user is not authenticated.
 */
export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const { auth } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({
    headers: new Headers(),
    query: {
      disableRefresh: (ctx.db as any).patch === undefined, // Disable refresh for queries
    },
  });

  if (!session?.user) {
    throw new Error("Unauthenticated");
  }

  return session.user;
}

/**
 * Get the authenticated user from the context, or null if not authenticated.
 */
export async function getAuthUserOrNull(ctx: QueryCtx | MutationCtx) {
  try {
    return await getAuthUser(ctx);
  } catch {
    return null;
  }
}

/**
 * Get the user ID from the main users table for the authenticated user.
 * This looks up the user by email from the betterAuth user.
 */
export async function getAppUserId(ctx: QueryCtx | MutationCtx) {
  const authUser = await getAuthUser(ctx);

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", authUser.email))
    .unique();

  if (!user) {
    throw new Error("User not found in app database. Please sync your account.");
  }

  return user._id;
}

/**
 * Get the user ID from the main users table, or null if not found.
 */
export async function getAppUserIdOrNull(ctx: QueryCtx | MutationCtx) {
  try {
    return await getAppUserId(ctx);
  } catch {
    return null;
  }
}
