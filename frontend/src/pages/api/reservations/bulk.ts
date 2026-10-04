import { createProxyHandler } from "@/lib/api/proxy";`n`nexport const PATCH = createProxyHandler({ path: "/reservations/bulk", method: "PATCH" });
