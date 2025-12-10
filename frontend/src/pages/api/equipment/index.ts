import type { APIRoute } from 'astro';

import { BACKEND_URL } from '@/lib/config/api';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const backendUrl = new URL(`${BACKEND_URL}/equipment`);

  // Forward query parameters
  url.searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  // Get session token from middleware (already validated)
  const token = locals.accessToken;


  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(backendUrl.toString(), {
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

export const POST: APIRoute = async ({ request, locals }) => {
  const backendUrl = `${BACKEND_URL}/equipment`;

  // Get session token for forwarding
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
