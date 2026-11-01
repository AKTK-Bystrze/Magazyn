// frontend/src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";
import { decryptSession, SESSION_COOKIE } from "@/lib/auth/session-store";

export const POST: APIRoute = async ({ cookies, locals }) => {
  locals.logger?.info("User logging out");

  const rawCookie = cookies.get(SESSION_COOKIE)?.value ?? null;
  if (rawCookie) {
    const session = await decryptSession(rawCookie);
    if (session) {
      try {
        await fetch(
          `${process.env.INTERNAL_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=global`,
          {
            method: "POST",
            headers: {
              apikey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );
      } catch (error) {
        locals.logger?.warn("Failed to revoke Supabase session on logout", { error });
      }
    }
  }

  cookies.delete(SESSION_COOKIE, { path: "/" });
  return Response.json({ message: "Logged out" });
};
