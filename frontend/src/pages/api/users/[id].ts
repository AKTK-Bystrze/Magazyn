import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

export const prerender = false;

/**
 * GET /api/users/[id] - Get user details
 * Admin/SuperAdmin only
 */
export const GET: APIRoute = async ({ locals, params }) => {
  const token = locals.accessToken;
  const { id } = params;

  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!id) {
    return new Response(JSON.stringify({ message: "User ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    locals.logger?.info(`[Users API] GET /users/${id}`);

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/users/${id}`, {
      method: "GET",
      headers,
    });

    const data = await response.json();
    locals.logger?.info(`[Users API] GET Response status:`, { data: response.status });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Users API] GET Proxy error:`, { error: error });
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/users/[id] - Update user profile
 * SuperAdmin only
 */
export const PATCH: APIRoute = async ({ locals, params, request }) => {
  const token = locals.accessToken;
  const { id } = params;

  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!id) {
    return new Response(JSON.stringify({ message: "User ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    locals.logger?.info(`[Users API] PATCH /users/${id}`, { data: body });

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/users/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    locals.logger?.info(`[Users API] PATCH Response status:`, { data: response.status });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Users API] PATCH Proxy error:`, { error: error });
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
