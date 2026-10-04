import { createProxyHandler } from "@/lib/api/proxy";

export const GET = createProxyHandler({ path: "/calendar/availability", method: "GET", forwardQuery: true });
