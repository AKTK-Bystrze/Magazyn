import { createProxyHandler } from "@/lib/api/proxy";

export const GET = createProxyHandler({
  path: "/credits/history",
  method: "GET",
  forwardQuery: true,
});
