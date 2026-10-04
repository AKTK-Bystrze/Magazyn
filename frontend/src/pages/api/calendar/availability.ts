import { createProxyHandler } from "@/lib/api/proxy";`n`nexport const GET = createProxyHandler({ path: "/calendar/availability", method: "GET", forwardQuery: true });
