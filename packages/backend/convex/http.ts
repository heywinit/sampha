import { httpRouter } from "convex/server";
import { createAuth } from "./betterAuth/auth";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Helper to add CORS headers
const corsHeaders = (request: Request) => {
  const origin = request.headers.get("Origin");
  // Update this list with your frontend domains
  const allowedOrigins = [
    "https://sampha.ganthiyalabs.xyz",
    "http://localhost:3001",
    "http://localhost:3000",
  ];

  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Better-Auth-Client, x-xsrf-token",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
};

// Handle OPTIONS preflight requests for all auth routes
http.route({
  pathPrefix: "/api/auth/",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }),
});

// Register GET/POST auth routes with manual CORS header injection
http.route({
  pathPrefix: "/api/auth/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = createAuth(ctx);
    const response = await auth.handler(request);
    const headers = new Headers(response.headers);
    const cors = corsHeaders(request);
    Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }),
});

http.route({
  pathPrefix: "/api/auth/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = createAuth(ctx);
    const response = await auth.handler(request);
    const headers = new Headers(response.headers);
    const cors = corsHeaders(request);
    Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }),
});

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

export default http;
