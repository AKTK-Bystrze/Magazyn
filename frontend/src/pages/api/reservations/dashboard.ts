import { createProxyHandler } from "@/lib/api/proxy";

export const GET = createProxyHandler({
  path: "/reservations/dashboard",
  method: "GET",
  forwardQuery: true,
});
