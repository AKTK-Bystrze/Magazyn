import { createProxyHandler } from "@/lib/api/proxy";

export const PATCH = createProxyHandler({ path: "/credits/requests/[id]/status", method: "PATCH" });
