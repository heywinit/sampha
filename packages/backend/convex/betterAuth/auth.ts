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

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET

// Better Auth Options
export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const baseURL =
    process.env.BETTER_AUTH_URL || process.env.SITE_URL || process.env.CONVEX_SITE_URL;
  const secret = BETTER_AUTH_SECRET;


  if (!secret) {
    console.error("BETTER_AUTH_SECRET is missing. Auth will not function correctly.");
  }

  const trustedOrigins = [
    "http://localhost:3001",
    "https://sampha.ganthiyalabs.xyz",
    baseURL,
  ].filter((origin): origin is string => origin !== undefined);

  return {
    appName: "Sampha",
    baseURL,
    secret,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
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
