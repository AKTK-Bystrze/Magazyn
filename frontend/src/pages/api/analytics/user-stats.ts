import { createProxyHandler } from "@/lib/api/proxy";`n`nexport const GET = createProxyHandler({ path: "/analytics/user-stats", method: "GET", forwardQuery: true });
