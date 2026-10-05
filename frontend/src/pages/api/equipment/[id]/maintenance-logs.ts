import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const POST = createProxyHandler({
  path: "/equipment/[id]/maintenance-logs",
  method: "POST",
});
