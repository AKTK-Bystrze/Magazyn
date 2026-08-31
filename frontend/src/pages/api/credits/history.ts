import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const prerender = false;

/**
 * GET /api/credits/history - List credit transactions for the current user
 */
export const GET: APIRoute = async ({ locals, request }) => {
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = new URL(`${BACKEND_URL}/credits/history`);

    // Forward all query parameters (page, per_page)
    backendUrl.search = url.search;

    locals.logger?.info(`[Credits History API] GET Request URL:`, { data: backendUrl.toString() });

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      return new Response(JSON.stringify(errorData), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    locals.logger?.info(`[Credits History API] GET Response status:`, { data: response.status });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Credits History API] GET Proxy error:`, { error: error });
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
