import type { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { authComponent, createAuth } from "../betterAuth/auth";

/**
 * Get the authenticated user from the context.
 * Throws an error if the user is not authenticated.
 */
export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  // Try native Convex Auth first (recommended)
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    return {
      id: identity.subject,
      name: identity.name || identity.email || "User",
      email: identity.email!,
      image: identity.pictureUrl,
    };
  }

  // Fallback to manual Better Auth call (only if native auth fails/is missing)
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
    .withIndex("by_email_active", (q) => q.eq("email", authUser.email).eq("isDeleted", false))
    .order("desc") // Most recent first
    .first();

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

/**
 * Get the membership document for a user in a workspace.
 */
export async function getWorkspaceMembership(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
    .unique();
}

/**
 * Assert that the user is a member of the workspace.
 */
export async function assertWorkspaceMember(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
) {
  const membership = await getWorkspaceMembership(ctx, workspaceId, userId);

  if (!membership) {
    throw new Error("You must be a workspace member to perform this action");
  }

  return membership;
}

/**
 * Assert that the user is an admin of the workspace.
 */
export async function assertWorkspaceAdmin(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
) {
  const membership = await assertWorkspaceMember(ctx, workspaceId, userId);

  if (membership.role !== "admin") {
    throw new Error("You must be a workspace admin to perform this action");
  }

  return membership;
}
