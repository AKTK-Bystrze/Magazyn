import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({
  path: "/equipment",
  method: "GET",
  forwardQuery: true,
  requireAuth: false,
});
export const POST = createProxyHandler({ path: "/equipment", method: "POST" });
