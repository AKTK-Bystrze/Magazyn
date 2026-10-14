import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({
  path: "/users/public",
  method: "GET",
  forwardQuery: true,
});
