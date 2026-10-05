import { createProxyHandler } from "@/lib/api/proxy";

export const GET = createProxyHandler({
  path: "/users/credits",
  method: "GET",
  forwardQuery: true,
});
