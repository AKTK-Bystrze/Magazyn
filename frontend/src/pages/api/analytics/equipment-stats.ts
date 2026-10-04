import { createProxyHandler } from "@/lib/api/proxy";

export const GET = createProxyHandler({ path: "/analytics/equipment-stats", method: "GET", forwardQuery: true });
