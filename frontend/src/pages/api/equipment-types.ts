import type { APIRoute } from "astro";
import { BACKEND_URL } from "@/lib/config/api";
import { equipmentTypesQuerySchema } from "@/lib/schemas/api-schemas";

export const prerender = false;

/**
 * Proxy endpoint for equipment types
 * GET /api/equipment-types -> Backend GET /equipment-types
 */
export const GET: APIRoute = async ({ request, locals }) => {
  locals.logger?.info("Listing equipment types");
  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams);

  // Validate input
  const result = equipmentTypesQuerySchema.safeParse(rawParams);
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query parameters",
        details: result.error.format(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const backendUrl = new URL(`${BACKEND_URL}/equipment-types`);

  // Forward validated parameters
  Object.entries(result.data).forEach(([key, value]) => {
    if (value !== undefined) {
      backendUrl.searchParams.append(key, String(value));
    }
  });

  // Get session token from middleware (already validated)
  const token = locals.accessToken;

  const headers = new Headers({
    "X-Trace-Id": locals.trace_id || "",
    "Content-Type": "application/json",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  locals.logger?.info("Proxying API request", { method: "GET", url: backendUrl.toString() });
  const response = await fetch(backendUrl, {
    method: "GET",
    headers,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
