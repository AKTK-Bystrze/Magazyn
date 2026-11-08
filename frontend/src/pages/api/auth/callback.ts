// frontend/src/pages/api/auth/callback.ts
// Magic-link authentication callback handler:
// 1. GET renders a styled client-side handoff page that extracts tokens from the URL fragment and POSTs them.
// 2. POST validates the tokens against Supabase, retrieves user session info, and sets the encrypted HttpOnly session cookie.
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
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Logowanie | Magazyn</title>
    <style>
      :root {
        --bg: #ffffff;
        --fg: #09090b;
        --muted: #71717a;
        --spinner: #18181b;
        --spinner-track: #e4e4e7;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #09090b;
          --fg: #fafafa;
          --muted: #a1a1aa;
          --spinner: #fafafa;
          --spinner-track: #27272a;
        }
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: var(--bg);
        color: var(--fg);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
      }
      .card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.25rem;
        max-width: 320px;
        width: 100%;
      }
      .spinner {
        width: 36px;
        height: 36px;
        border: 3.5px solid var(--spinner-track);
        border-top-color: var(--spinner);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .title {
        font-size: 0.9375rem;
        font-weight: 500;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner" aria-hidden="true"></div>
      <p class="title">Trwa logowanie, proszę czekać...</p>
    </div>
    <script>
      (async () => {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const search = new URLSearchParams(window.location.search);
        const err =
          hash.get("error_code") ||
          hash.get("error") ||
          search.get("error_code") ||
          search.get("error");
        if (err) return window.location.replace("/login?error=" + encodeURIComponent(err));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (!accessToken || !refreshToken) {
          return window.location.replace("/login?error=missing_session");
        }
        const expiresAt = hash.get("expires_at");
        try {
          const res = await fetch("/api/auth/callback" + window.location.search, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-magazyn-handoff": "1",
            },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Number(expiresAt) || null,
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

export const GET = async (): Promise<Response> =>
  new Response(HANDOFF_PAGE, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store, max-age=0",
    },
  });

export const POST: APIRoute = async ({ url, request, cookies, locals }) => {
  // Verify handoff header to guard against cross-site request forgery.
  if (request.headers.get(HANDOFF_HEADER) !== "1") {
    locals.logger?.warn("Magic link callback rejected: missing or invalid handoff header");
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: rawExpiresAt,
  } = (await request.json().catch(() => ({}))) ?? {};

  if (!accessToken || !refreshToken) {
    locals.logger?.warn("Magic link callback rejected: missing tokens in payload");
    return Response.json({ error: "missing_session" }, { status: 400 });
  }

  const expiresAt = typeof rawExpiresAt === "number" && rawExpiresAt > 0 ? rawExpiresAt : null;

  // Validate the tokens with Supabase before trusting them.
  const supabase = createClient(
    process.env.INTERNAL_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL,
    process.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    locals.logger?.warn("Magic link token rejected by Supabase", { error: error?.message });
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  // Fetch authoritative role + enabled status from the Go backend.
  const sessionRes = await getUserSession(accessToken);
  if (sessionRes.status !== "ok") {
    locals.logger?.error("Magic link session info fetch failed from backend", {
      userId: data.user.id,
    });
    return Response.json({ error: "session_fetch_failed" }, { status: 502 });
  }

  const sessionInfo = sessionRes.sessionInfo;

  const session: MagazynSession = {
    userId: data.user.id,
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? Math.floor(Date.now() / 1000) + 3600,
  };

  try {
    const encryptedCookie = await encryptSession(session);
    cookies.set(SESSION_COOKIE, encryptedCookie, SESSION_COOKIE_OPTIONS);
  } catch (err) {
    locals.logger?.error("Failed to encrypt session cookie", { error: err });
    return Response.json({ error: "encryption_failed" }, { status: 500 });
  }

  locals.logger?.info("Magic link authentication successful", {
    userId: data.user.id,
    role: sessionInfo.role,
  });

  const redirectTo = RedirectManager.getRedirectForAuthState(
    data.user,
    sessionInfo,
    "/login",
    url.searchParams.get("redirect"),
    url.origin
  );

  return Response.json({ redirectTo: redirectTo ?? "/dashboard" });
};
