import type { APIRoute } from 'astro';
import { BACKEND_URL } from '@/lib/config/api';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const backendUrl = `${BACKEND_URL}/auth/login`;

    try {
        const body = await request.text();

        console.log(`[Proxy] Forwarding login request to: ${backendUrl}`);

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body,
        });

        const contentType = response.headers.get('content-type');
        const responseBody = await response.text();

        if (!contentType || !contentType.includes('application/json')) {
            console.error(`[Proxy] Backend returned non-JSON response: ${response.status} ${contentType}`);
            console.error(`[Proxy] Response body preview: ${responseBody.substring(0, 200)}`);

            return new Response(JSON.stringify({
                error: `Backend Error: Received ${response.status} (${contentType || 'unknown type'})`
            }), {
                status: 502,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        return new Response(responseBody, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error proxying login request:', error);
        return new Response(JSON.stringify({
            error: 'Failed to connect to authentication server. Please try again later.'
        }), {
            status: 502, // Bad Gateway
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};
