import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;
export const POST = createProxyHandler({ path: "/auth/login", method: "POST", requireAuth: false });
