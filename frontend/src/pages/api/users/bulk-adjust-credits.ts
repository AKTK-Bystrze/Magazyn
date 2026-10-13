import { createProxyHandler } from "@/lib/api/proxy";

export const POST = createProxyHandler({ path: "/users/bulk-adjust-credits", method: "POST" });
