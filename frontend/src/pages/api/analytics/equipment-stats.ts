import { createProxyHandler } from "@/lib/api/proxy";`n`nexport const GET = createProxyHandler({ path: "/analytics/equipment-stats", method: "GET", forwardQuery: true });
