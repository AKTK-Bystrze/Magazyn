import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

/**
 * POST /api/reservations - Create new reservations
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
    locals.logger?.info(`[Reservations API] POST Request body:`, {
      data: JSON.stringify(body, null, 2),
    });

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/reservations`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    locals.logger?.info(`[Reservations API] POST Response status:`, { data: response.status });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Reservations API] POST Proxy error:`, { error: error });
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * GET /api/reservations - List reservations with filtering and pagination
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
    const backendUrl = new URL(`${BACKEND_URL}/reservations`);

    // Forward all query parameters
    backendUrl.search = url.search;

    locals.logger?.info(`[Reservations API] GET Request URL:`, { data: backendUrl.toString() });

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
    locals.logger?.info(`[Reservations API] GET Response status:`, { data: response.status });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    locals.logger?.error(`[Reservations API] GET Proxy error:`, { error: error });
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/reservations - Update reservation (delegates to /api/reservations/[id])
 * Note: Individual reservation updates should use /api/reservations/[id].ts
 * This handles bulk updates at /api/reservations/bulk
 */
export const PATCH: APIRoute = async ({ locals, request }) => {
  const token = locals.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const url = new URL(request.url);

    // Check if this is a bulk update
    const isBulk = url.pathname.endsWith("/bulk");
    const backendPath = isBulk ? "/reservations/bulk" : "/reservations";

    locals.logger?.info(`[Reservations API] PATCH Request:`, { data: backendPath });

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}${backendPath}`, {
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
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
