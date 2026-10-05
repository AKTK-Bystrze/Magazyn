import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({
  path: "/equipment/[id]",
  method: "GET",
  requireAuth: false,
});
export const PATCH = createProxyHandler({ path: "/equipment/[id]", method: "PATCH" });
export const DELETE = createProxyHandler({ path: "/equipment/[id]", method: "DELETE" });
