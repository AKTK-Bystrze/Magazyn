import { createProxyHandler } from "@/lib/api/proxy";

export const prerender = false;

export const GET = createProxyHandler({ path: "/reservations", method: "GET", forwardQuery: true });
export const POST = createProxyHandler({ path: "/reservations", method: "POST" });
