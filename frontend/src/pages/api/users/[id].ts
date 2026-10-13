import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({ path: "/users/[id]", method: "GET" });
export const PATCH = createProxyHandler({ path: "/users/[id]", method: "PATCH" });
