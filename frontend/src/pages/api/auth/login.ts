import type { APIRoute } from 'astro';
import { BACKEND_URL } from '@/lib/config/api';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const backendUrl = `${BACKEND_URL}/auth/login`;
  const body = await request.text();

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
