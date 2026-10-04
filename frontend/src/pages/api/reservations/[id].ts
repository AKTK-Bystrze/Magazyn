import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const PUT = createProxyHandler({ path: "/reservations/[id]", method: "PUT" });
