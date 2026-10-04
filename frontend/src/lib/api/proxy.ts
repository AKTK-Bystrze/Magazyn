import type { APIContext } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

interface ProxyOptions {
  /** Backend path, e.g. "/reservations/bulk" */
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Whether to forward query params from the original request */
  forwardQuery?: boolean;
}

/**
 * Creates a standard authenticated proxy handler for Astro API routes.
 * Forwards the request to the Go backend with the JWT token and trace ID.
 */
export function createProxyHandler(opts: ProxyOptions) {
  return async ({ locals, request, params }: APIContext): Promise<Response> => {
    const token = locals.accessToken;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Interpolate dynamic segments from Astro params (e.g. [id])
      const resolvedPath = opts.path.replace(/\[(\w+)\]/g, (_, key) => params[key] ?? "");
      const backendUrl = new URL(`${BACKEND_URL}${resolvedPath}`);

      if (opts.forwardQuery) {
        backendUrl.search = new URL(request.url).search;
      }

      const headers = new Headers({
        "X-Trace-Id": locals.trace_id || "",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      });

      const fetchOpts: RequestInit = { method: opts.method, headers };
      if (opts.method !== "GET" && opts.method !== "DELETE") {
        fetchOpts.body = JSON.stringify(await request.json());
      }

      const response = await fetch(backendUrl.toString(), fetchOpts);
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      locals.logger?.error(`[Proxy] ${opts.method} ${opts.path} error:`, { error });
      return new Response(JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
