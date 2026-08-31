import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const prerender = false;

/**
 * POST /api/users/bulk-adjust-credits - Bulk adjust user credits
 * SuperAdmin only
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    locals.logger?.info(`[Users API] POST /users/bulk-adjust-credits`, { data: body });

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/users/bulk-adjust-credits`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    locals.logger?.info(`[Users API] POST bulk-adjust Response status:`, { data: response.status });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Users API] POST bulk-adjust Proxy error:`, { error: error });
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
