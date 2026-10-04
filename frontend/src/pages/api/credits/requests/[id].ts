import { createProxyHandler } from "@/lib/api/proxy";`n`nexport const PUT = createProxyHandler({ path: "/credits/requests/[id]", method: "PUT" });
