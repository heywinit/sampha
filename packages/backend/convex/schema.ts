import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal("private"), v.literal("shared")),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_slug", ["slug"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_isDeleted", ["isDeleted"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    notificationSettings: v.any(), // Flexible JSON object
    defaultView: v.union(v.literal("timeline"), v.literal("calendar"), v.literal("kanban")),
    timezone: v.string(),
  }).index("by_user", ["userId"]),

  projects: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_workspace", ["workspaceId"]),

  phases: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    order: v.number(),
  }).index("by_project", ["projectId"]),

  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    phaseId: v.id("phases"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    startDate: v.number(),
    dueDate: v.number(),
    assigneeIds: v.array(v.id("users")),
    watcherIds: v.array(v.id("users")),
    priority: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_phase", ["phaseId"]),

  subtasks: defineTable({
    taskId: v.id("tasks"),
    title: v.string(),
    isCompleted: v.boolean(),
    order: v.number(),
  }).index("by_task", ["taskId"]),

  taskDependencies: defineTable({
    workspaceId: v.id("workspaces"),
    fromTaskId: v.id("tasks"),
    toTaskId: v.id("tasks"),
    type: v.union(v.literal("blocks"), v.literal("relatesTo")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_from_task", ["fromTaskId"])
    .index("by_to_task", ["toTaskId"]),

  userWorkspaceStates: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    lastViewedProjectId: v.optional(v.id("projects")),
    lastView: v.union(v.literal("timeline"), v.literal("calendar"), v.literal("kanban")),
    timelineZoomLevel: v.number(),
    collapsedProjectIds: v.array(v.id("projects")),
  })
    .index("by_user_workspace", ["userId", "workspaceId"])
    .index("by_workspace", ["workspaceId"]),

  comments: defineTable({
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    authorId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_task", ["taskId"]),

  activities: defineTable({
    workspaceId: v.id("workspaces"),
    entityType: v.union(v.literal("task"), v.literal("project"), v.literal("phase")),
    entityId: v.string(),
    action: v.string(),
    actorId: v.id("users"),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_entity", ["entityId"]),

  notifications: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("status_change"),
      v.literal("due_soon"),
      v.literal("overdue"),
    ),
    entityType: v.string(),
    entityId: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_workspace", ["workspaceId"]),

  githubConnections: defineTable({
    workspaceId: v.id("workspaces"),
    installationId: v.number(),
    repositories: v.array(v.string()),
  }).index("by_workspace", ["workspaceId"]),

  githubLinks: defineTable({
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    type: v.union(v.literal("issue"), v.literal("pull_request")),
    repo: v.string(),
    externalId: v.string(),
    url: v.string(),
    status: v.string(),
    lastSyncedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_task", ["taskId"]),

  externalComments: defineTable({
    githubLinkId: v.id("githubLinks"),
    externalCommentId: v.string(),
    author: v.any(),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_github_link", ["githubLinkId"]),

  statusConfigs: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    order: v.number(),
    color: v.string(),
    isTerminal: v.boolean(),
  }).index("by_workspace", ["workspaceId"]),
});
