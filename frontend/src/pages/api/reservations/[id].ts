import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({ path: "/reservations/[id]", method: "GET" });
export const PATCH = createProxyHandler({ path: "/reservations/[id]", method: "PATCH" });
