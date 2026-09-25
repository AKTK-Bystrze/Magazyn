import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const PUT: APIRoute = async ({ locals, request, params }) => {
  locals.logger?.info(`Updating credit request ${params.id}`);
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/credits/requests/${params.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Credits API] PUT Proxy error:`, { error: error });
    return new Response(
      JSON.stringify({ error: "Internal Server Error", code: "INTERNAL_ERROR" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
