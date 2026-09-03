import type { APIRoute } from "astro";
import { AUTH_COOKIE_NAME } from "../../../lib/auth/cookie-utils";

export const POST: APIRoute = async ({ cookies, locals }) => {
  locals.logger?.info("User logging out");
  cookies.delete(AUTH_COOKIE_NAME, {
    path: "/",
  });

  return new Response(JSON.stringify({ message: "Logged out" }), {
    status: 200,
  });
};
