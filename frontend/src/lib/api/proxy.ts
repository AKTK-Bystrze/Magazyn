import type { APIContext } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

interface ProxyOptions {
  /** Backend path, e.g. "/reservations/bulk" */
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Whether to forward query params from the original request */
  forwardQuery?: boolean;
  /** Whether the route requires authentication (defaults to true) */
  requireAuth?: boolean;
}

/**
 * Creates a standard proxy handler for Astro API routes.
 * Forwards the request to the Go backend with the JWT token and trace ID.
 */
export function createProxyHandler(opts: ProxyOptions) {
  const requireAuth = opts.requireAuth !== false;

  return async ({ locals, request, params }: APIContext): Promise<Response> => {
    const token = locals.accessToken;

    if (requireAuth && !token) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const resolvedPath = opts.path.replace(/\[(\w+)\]/g, (_, key) => params[key] ?? "");
      const backendUrl = new URL(`${BACKEND_URL}${resolvedPath}`);

      if (opts.forwardQuery) {
        backendUrl.search = new URL(request.url).search;
      }

      const headers = new Headers({
        "X-Trace-Id": locals.trace_id || "",
        "Content-Type": "application/json",
      });

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const fetchOpts: RequestInit = { method: opts.method, headers };
      if (opts.method !== "GET" && opts.method !== "DELETE") {
        const rawBody = await request.text();
        if (rawBody) {
          fetchOpts.body = rawBody;
        }
      }

      const response = await fetch(backendUrl.toString(), fetchOpts);
      const responseText = await response.text();

      const responseContentType = response.headers.get("Content-Type") || "application/json";

      return new Response(responseText, {
        status: response.status,
        headers: { "Content-Type": responseContentType },
      });
    } catch (error) {
      locals.logger?.error(`[Proxy] ${opts.method} ${opts.path} error:`, { error });
      return new Response(
        JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}
