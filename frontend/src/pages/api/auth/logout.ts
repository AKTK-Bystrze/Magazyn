// frontend/src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";
import { decryptSession, SESSION_COOKIE, clearAllCookies } from "@/lib/auth/session-store";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    locals.logger?.warn("Cross-site logout rejected");
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  locals.logger?.info("User logging out");

  const rawCookie = cookies.get(SESSION_COOKIE)?.value;
  const session = rawCookie ? await decryptSession(rawCookie) : null;
  if (session) {
    try {
      const anonKey =
        process.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
      const supabaseUrl = process.env.INTERNAL_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;

      const resp = await fetch(`${supabaseUrl}/auth/v1/logout?scope=global`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!resp.ok) {
        locals.logger?.warn("Supabase session revocation responded with non-2xx status", {
          status: resp.status,
        });
      }
    } catch (error) {
      locals.logger?.warn("Failed to revoke Supabase session on logout", { error });
    }
  }

  clearAllCookies(request, cookies);
  return Response.json({ message: "Logged out" });
};
