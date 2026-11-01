// frontend/src/pages/api/auth/callback.ts
// Magic-link landing handler.
//
// The Go backend requests the OTP without a PKCE challenge, so GoTrue uses the
// implicit flow: after the user clicks the email link, the session arrives in
// the URL fragment (`#access_token=...`), which never reaches the server. This
// GET handler therefore renders a tiny page that reads the fragment and POSTs
// the tokens back. The POST handler validates them against Supabase and sets
// the HttpOnly session cookie.
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import {
  encryptSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  type MagazynSession,
} from "@/lib/auth/session-store";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";

export const prerender = false;

const HANDOFF_HEADER = "x-magazyn-handoff";

const HANDOFF_PAGE = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <title>Logowanie</title>
  </head>
  <body>
    <p>Trwa logowanie, proszę czekać...</p>
    <script>
      (async () => {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        if (hash.get("error")) {
          window.location.replace("/login?error=" + encodeURIComponent(hash.get("error")));
          return;
        }
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (!accessToken || !refreshToken) {
          window.location.replace("/login?error=missing_session");
          return;
        }
        const expiresAt = hash.get("expires_at");
        try {
          const res = await fetch("/api/auth/callback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-magazyn-handoff": "1",
            },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: expiresAt ? parseInt(expiresAt, 10) : null,
            }),
          });
          const data = await res.json().catch(() => ({}));
          window.location.replace(
            data?.redirectTo || "/login?error=" + encodeURIComponent(data?.error || "login_failed")
          );
        } catch {
          window.location.replace("/login?error=network");
        }
      })();
    </script>
  </body>
</html>`;

export const GET: APIRoute = async () =>
  new Response(HANDOFF_PAGE, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store, max-age=0",
    },
  });

export const POST: APIRoute = async ({ url, request, cookies }) => {
  // Only the handoff page may call this route. A cross-site form cannot set a
  // custom header without a CORS preflight, which this server never allows,
  // so this guards against login-CSRF (logging a victim into the attacker's
  // account).
  if (request.headers.get(HANDOFF_HEADER) !== "1") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const accessToken = typeof body?.access_token === "string" ? body.access_token : "";
  const refreshToken = typeof body?.refresh_token === "string" ? body.refresh_token : "";
  const expiresAt =
    typeof body?.expires_at === "number" && body.expires_at > 0 ? body.expires_at : null;

  if (!accessToken || !refreshToken) {
    return Response.json({ error: "missing_session" }, { status: 400 });
  }

  // Validate the tokens with Supabase before trusting them.
  const supabase = createClient(
    process.env.INTERNAL_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  // Fetch authoritative role + enabled status from the Go backend.
  const sessionInfo = await getUserSession(accessToken);
  if (!sessionInfo) {
    return Response.json({ error: "session_fetch_failed" }, { status: 502 });
  }

  const session: MagazynSession = {
    userId: data.user.id,
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? Math.floor(Date.now() / 1000) + 3600,
  };

  cookies.set(SESSION_COOKIE, await encryptSession(session), SESSION_COOKIE_OPTIONS);

  const redirectTo = RedirectManager.getRedirectForAuthState(
    data.user,
    sessionInfo,
    "/login",
    url.searchParams.get("redirect"),
    url.origin
  );

  return Response.json({ redirectTo: redirectTo ?? "/dashboard" });
};
