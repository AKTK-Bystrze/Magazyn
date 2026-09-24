import type { APIRoute } from "astro";
import { clearAllAuthCookies } from "../../../lib/auth/cookie-utils";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  locals.logger?.info("User logging out");

  try {
    // Attempt to notify Supabase to revoke the session, but ignore errors
    // (e.g. if the token is already invalid)
    await locals.supabase.auth.signOut();
  } catch (err) {
    locals.logger?.warn("Supabase server signOut failed, proceeding to clear cookies", { err });
  }

  // Force clear all authentication cookies directly
  clearAllAuthCookies(request, cookies);

  return new Response(JSON.stringify({ message: "Logged out" }), {
    status: 200,
  });
};
