import { createProxyHandler } from "@/lib/api/proxy";

export const PUT = createProxyHandler({ path: "/credits/requests/[id]", method: "PUT" });
