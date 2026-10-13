import { createProxyHandler } from "@/lib/api/proxy";

export const GET = createProxyHandler({ path: "/users/me", method: "GET" });
