import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";
import { debug } from "@/lib/utils/debug";

/**
 * GET /api/reservations/[id] - Get reservation details with audit trail
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
    return new Response(JSON.stringify({ message: "Reservation ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    debug.log("Reservations API", `GET /reservations/${id}`);

    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/reservations/${id}`, {
      method: "GET",
      headers,
    });

    const data = await response.json();
    debug.log("Reservations API", "GET Response status:", response.status);

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    debug.error("Reservations API", "GET Proxy error:", error);
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
 * PATCH /api/reservations/[id] - Update reservation (dates or status)
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
    return new Response(JSON.stringify({ message: "Reservation ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    debug.log("Reservations API", `PATCH /reservations/${id}`, body);

    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/reservations/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    debug.log("Reservations API", "PATCH Response status:", response.status);

    if (!response.ok) {
      debug.error("Reservations API", "PATCH Backend Error:", data);
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    debug.error("Reservations API", "PATCH Proxy error:", error);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
