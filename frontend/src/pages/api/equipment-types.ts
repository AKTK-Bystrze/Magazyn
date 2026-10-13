import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;
export const GET = createProxyHandler({
  path: "/equipment-types",
  method: "GET",
  forwardQuery: true,
  requireAuth: false,
});
