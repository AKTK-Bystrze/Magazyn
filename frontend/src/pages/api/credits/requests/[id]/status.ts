import { createProxyHandler } from "@/lib/api/proxy";`n`nexport const PATCH = createProxyHandler({ path: "/credits/requests/[id]/status", method: "PATCH" });
