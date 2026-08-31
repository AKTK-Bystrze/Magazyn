import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

/**
 * GET /api/reservations/[id] - Get reservation details with audit trail
 */
export const GET: APIRoute = async ({ locals, params }) => {
  locals.logger?.info(`Fetching reservation ${params.id}`);
  const token = locals.accessToken;
  const { id } = params;

  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!id) {
    return new Response(JSON.stringify({ message: "Reservation ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    locals.logger?.info(`[Reservations API] GET /reservations/${id}`);

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/reservations/${id}`, {
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
 * PATCH /api/reservations/[id] - Update reservation (dates or status)
 */
export const PATCH: APIRoute = async ({ locals, params, request }) => {
  locals.logger?.info(`Updating reservation ${params.id}`);
  const token = locals.accessToken;
  const { id } = params;

  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!id) {
    return new Response(JSON.stringify({ message: "Reservation ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    locals.logger?.info(`[Reservations API] PATCH /reservations/${id}`, { data: body });

    const headers = new Headers({
      "X-Trace-Id": locals.trace_id || "",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/reservations/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    locals.logger?.info(`[Reservations API] PATCH Response status:`, { data: response.status });

    if (!response.ok) {
      locals.logger?.error(`[Reservations API] PATCH Backend Error:`, { error: data });
    }

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
