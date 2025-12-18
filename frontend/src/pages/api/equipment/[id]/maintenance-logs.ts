import type { APIRoute } from 'astro';
import { BACKEND_URL } from '@/lib/config/api';

export const prerender = false;

/**
 * GET /api/equipment/{id}/maintenance-logs
 * Proxy to backend to fetch maintenance logs for equipment
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}/maintenance-logs`;

  const { data: { session } } = await locals.supabase.auth.getSession();

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
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

/**
 * POST /api/equipment/{id}/maintenance-logs
 * Proxy to backend to add a maintenance log
 */
export const POST: APIRoute = async ({ request, params, locals }) => {
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}/maintenance-logs`;

  const { data: { session } } = await locals.supabase.auth.getSession();

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const body = await request.text();

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers,
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
