import type { APIRoute } from 'astro';

import { BACKEND_URL } from '@/lib/config/api';

export const GET: APIRoute = async ({ params, locals }) => {
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}`;

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

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}`;

  const { data: { session } } = await locals.supabase.auth.getSession();

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const body = await request.text();

  const response = await fetch(backendUrl, {
    method: 'PATCH',
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

export const DELETE: APIRoute = async ({ params, locals }) => {
  const backendUrl = `${BACKEND_URL}/equipment/${params.id}`;

  const { data: { session } } = await locals.supabase.auth.getSession();

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(backendUrl, {
    method: 'DELETE',
    headers,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
