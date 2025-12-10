import { DEFAULT_HEADERS } from '@/lib/config/api';
import { supabase } from '@/lib/supabase';

/**
 * Builds headers for API requests with optional authentication
 * Eliminates duplicated header building logic
 */
async function buildHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export const api = {
  post: async <T>(url: string, data: any): Promise<{ data: T }> => {
    const headers = await buildHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw errorData;
    }

    const resData = await response.json();
    return { data: resData };
  },

  get: async <T>(url: string, params?: Record<string, any>): Promise<{ data: T }> => {
    const headers = await buildHeaders();

    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw errorData;
    }

    const resData = await response.json();
    return { data: resData };
  },
};
