import type { APIRoute } from "astro";

import { BACKEND_URL } from "@/lib/config/api";

export const prerender = false;

export const GET: APIRoute = async ({ request, params, locals }) => {
  locals.logger?.info(`Checking availability for equipment ${params.id}`);
  const url = new URL(request.url);
  const backendUrl = new URL(`${BACKEND_URL}/equipment/${params.id}/availability`);

  // Forward query parameters (start_date, end_date)
  url.searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  // Get token from middleware
  const token = locals.accessToken;

  const headers = new Headers({
    "X-Trace-Id": locals.trace_id || "",
    "Content-Type": "application/json",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  locals.logger?.info("Proxying API request", {
    method: "GET",
    url: backendUrl.toString().toString(),
  });
  const response = await fetch(backendUrl.toString(), {
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
