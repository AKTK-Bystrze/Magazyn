import { createProxyHandler } from "@/lib/api/proxy";`n`nexport const GET = createProxyHandler({ path: "/users/credits", method: "GET", forwardQuery: true });
