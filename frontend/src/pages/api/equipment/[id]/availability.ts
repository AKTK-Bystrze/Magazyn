import type { APIRoute } from 'astro';

import { BACKEND_URL } from '@/lib/config/api';

export const prerender = false;

export const GET: APIRoute = async ({ request, params, locals }) => {
  const url = new URL(request.url);
  const backendUrl = new URL(`${BACKEND_URL}/equipment/${params.id}/availability`);

  // Forward query parameters (start_date, end_date)
  url.searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  const { data: { session } } = await locals.supabase.auth.getSession();

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
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
