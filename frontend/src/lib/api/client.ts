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

/**
 * Generic API client wrapper around fetch
 * Automatically handles headers and error parsing
 */
export const api = {
  /**
   * Performs a POST request
   * @param url - Endpoint URL
   * @param data - Request body data
   * @returns Response data wrapped in an object
   */
  post: async <T>(url: string, data: unknown): Promise<{ data: T }> => {
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

  /**
   * Performs a GET request
   * @param url - Endpoint URL
   * @param params - Optional query parameters
   * @returns Response data wrapped in an object
   */
  get: async <T>(url: string, params?: Record<string, string | number | boolean>): Promise<{ data: T }> => {
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

  /**
   * Performs a PATCH request
   *
   * @param url - Endpoint URL
   * @param data - Request body data
   * @returns Response data wrapped in an object
   */
  patch: async <T>(url: string, data: unknown): Promise<{ data: T }> => {
    const headers = await buildHeaders();

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Network error" }));
      throw errorData;
    }

    const resData = await response.json();
    return { data: resData };
  },
};
