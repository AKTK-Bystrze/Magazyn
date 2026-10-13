import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({ path: "/users", method: "GET", forwardQuery: true });
export const POST = createProxyHandler({ path: "/users", method: "POST" });
