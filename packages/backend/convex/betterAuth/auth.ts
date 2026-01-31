import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

// Better Auth Component
export const authComponent = createClient<DataModel, typeof schema>(components.betterAuth, {
  local: { schema },
  verbose: false,
});

// Better Auth Options
export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const baseURL =
    process.env.CONVEX_SITE_URL || process.env.SITE_URL || "https://astute-turtle-662.convex.site";
  const secret = process.env.BETTER_AUTH_SECRET;

  if (process.env.CONVEX_SCHEMA) {
    console.log("Initializing Better Auth with baseURL:", baseURL);
    console.log("BETTER_AUTH_SECRET present:", !!secret);
    console.log("CONVEX_SITE_URL:", process.env.CONVEX_SITE_URL);
  }

  if (!secret) {
    console.error("BETTER_AUTH_SECRET is missing. Auth will not function correctly.");
  }

  const trustedOrigins = ["http://localhost:3001", "https://sampha.ganthiyalabs.xyz"];

  if (process.env.CONVEX_SITE_URL) {
    trustedOrigins.push(process.env.CONVEX_SITE_URL);
  }

  return {
    appName: "Sampha",
    baseURL,
    secret,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins,
    plugins: [convex({ authConfig })],
  } satisfies BetterAuthOptions;
};

// For `@better-auth/cli`
export const options = createAuthOptions({} as GenericCtx<DataModel>);

// Better Auth Instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
