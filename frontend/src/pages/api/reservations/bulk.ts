import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const PATCH: APIRoute = async ({ locals, request }) => {
  locals.logger?.info("Bulk updating reservations");
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();

    locals.logger?.info(`[Reservations API] PATCH Request:`, { data: "/reservations/bulk" });

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/reservations/bulk`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    locals.logger?.info(`[Reservations API] PATCH Response status:`, { data: response.status });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Reservations API] PATCH Proxy error:`, { error: error });
    return new Response(
      JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
