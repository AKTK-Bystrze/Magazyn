import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";

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
    console.log('[Reservations API] Request body:', JSON.stringify(body, null, 2));

    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${BACKEND_URL}/reservations`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('[Reservations API] Response status:', response.status);
    console.log('[Reservations API] Response data:', JSON.stringify(data, null, 2));

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
