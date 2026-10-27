import type { APIRoute } from "astro";
import { clearAllAuthCookies } from "@/lib/auth/cookie-utils";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  locals.logger?.info("User logging out");

  clearAllAuthCookies(request, cookies);

  return new Response(JSON.stringify({ message: "Logged out" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
