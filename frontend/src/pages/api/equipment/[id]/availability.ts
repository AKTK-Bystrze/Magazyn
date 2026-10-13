import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({
  path: "/equipment/[id]/availability",
  method: "GET",
  forwardQuery: true,
  requireAuth: false,
});
