import { query } from "./_generated/server";

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return 0;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email_active", (q) => q.eq("email", identity.email!).eq("isDeleted", false))
      .order("desc")
      .first();

    if (!user) {
      return 0;
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();

    return unreadNotifications.length;
  },
});
