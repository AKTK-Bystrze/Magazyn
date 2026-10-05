import { createProxyHandler } from "@/lib/api/proxy";

export const PATCH = createProxyHandler({ path: "/reservations/bulk", method: "PATCH" });
