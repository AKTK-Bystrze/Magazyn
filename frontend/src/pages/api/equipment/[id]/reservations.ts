import type { APIRoute } from 'astro';
import { BACKEND_URL } from '@/lib/config/api';

export const prerender = false;

/**
 * GET /api/equipment/{id}/reservations
 * Proxy to backend to fetch reservation history for equipment
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}/reservations`;

  // Use token from middleware (already validated)
  const token = locals.accessToken;

  const headers = new Headers({
    'X-Trace-Id': locals.trace_id || '',
    'Content-Type': 'application/json',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  locals.logger?.info("Proxying API request", { method: "GET", url: backendUrl.toString() });
  const response = await fetch(backendUrl, {
    method: 'GET',
    headers,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
