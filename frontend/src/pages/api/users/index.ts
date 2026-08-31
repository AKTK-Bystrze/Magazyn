import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";
import { debug } from "@/lib/utils/debug";

export const prerender = false;

/**
 * GET /api/users - List all users with pagination and filtering
 * Admin/SuperAdmin only
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
    const backendUrl = new URL(`${BACKEND_URL}/users`);

    // Forward all query parameters
    backendUrl.search = url.search;

    debug.log("Users API", "GET Request URL:", backendUrl.toString());

    const headers = new Headers({
    'X-Trace-Id': locals.trace_id || '',
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    debug.log("Users API", "GET Response status:", response.status);

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    debug.error("Users API", "GET Proxy error:", error);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * POST /api/users - Create new user account
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
    debug.log("Users API", "POST Request body:", JSON.stringify(body, null, 2));

    const headers = new Headers({
    'X-Trace-Id': locals.trace_id || '',
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/users`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    debug.log("Users API", "POST Response status:", response.status);

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    debug.error("Users API", "POST Proxy error:", error);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
