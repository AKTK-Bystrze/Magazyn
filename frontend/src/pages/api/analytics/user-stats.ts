import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const GET: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Fetching user stats");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = new URL(`${BACKEND_URL}/analytics/user-stats`);
    backendUrl.search = url.search;

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Analytics API] GET Proxy error:`, { error: error });
    return new Response(
      JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
