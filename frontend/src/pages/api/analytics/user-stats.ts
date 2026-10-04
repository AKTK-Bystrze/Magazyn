import { createProxyHandler } from "@/lib/api/proxy";

export const GET = createProxyHandler({ path: "/analytics/user-stats", method: "GET", forwardQuery: true });
