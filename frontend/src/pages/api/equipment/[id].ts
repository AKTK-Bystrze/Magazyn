import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({
  path: "/equipment/[id]",
  method: "GET",
  requireAuth: false,
});
export const PUT = createProxyHandler({ path: "/equipment/[id]", method: "PUT" });
export const DELETE = createProxyHandler({ path: "/equipment/[id]", method: "DELETE" });
