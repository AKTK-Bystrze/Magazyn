import type { APIRoute } from 'astro';
import { BACKEND_URL } from '@/lib/config/api';

/**
 * Proxy endpoint for equipment types
 * GET /api/equipment-types -> Backend GET /equipment-types
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const backendUrl = `${BACKEND_URL}/equipment-types`;

  // Get session token from middleware (already validated)
  const token = locals.accessToken;

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

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
