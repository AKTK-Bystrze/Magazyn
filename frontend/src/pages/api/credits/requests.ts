import { createProxyHandler } from "@/lib/api/proxy";

export const GET = createProxyHandler({ path: "/credits/requests", method: "GET", forwardQuery: true });
export const POST = createProxyHandler({ path: "/credits/requests", method: "POST" });
