import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({
  path: "/equipment/[id]/reservations",
  method: "GET",
  forwardQuery: true,
});
