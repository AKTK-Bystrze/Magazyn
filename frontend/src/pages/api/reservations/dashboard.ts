import { createProxyHandler } from "@/lib/api/proxy";`n`nexport const GET = createProxyHandler({ path: "/reservations/dashboard", method: "GET", forwardQuery: true });
