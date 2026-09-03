import type { APIRoute } from "astro";

import { BACKEND_URL } from "@/lib/config/api";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  locals.logger?.info(`Fetching equipment ${params.id}`);
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}`;

  // Use token from middleware (already validated)
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

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  locals.logger?.info(`Updating equipment ${params.id}`);
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}`;

  // Use token from middleware (already validated)
  const token = locals.accessToken;

  const headers = new Headers({
    "X-Trace-Id": locals.trace_id || "",
    "Content-Type": "application/json",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const body = await request.text();

  locals.logger?.info("Proxying API request", { method: "PATCH", url: backendUrl.toString() });
  const response = await fetch(backendUrl, {
    method: "PATCH",
    headers,
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  locals.logger?.info(`Deleting equipment ${params.id}`);
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}`;

  // Use token from middleware (already validated)
  const token = locals.accessToken;

  const headers = new Headers({
    "X-Trace-Id": locals.trace_id || "",
    "Content-Type": "application/json",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  locals.logger?.info("Proxying API request", { method: "DELETE", url: backendUrl.toString() });
  const response = await fetch(backendUrl, {
    method: "DELETE",
    headers,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
