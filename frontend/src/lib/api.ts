const BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';
import { supabase } from '@/lib/supabase';

export const api = {
  post: async <T>(url: string, data: any): Promise<{ data: T }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${url}`, {
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
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const fullUrl = queryString ? `${BASE_URL}${url}?${queryString}` : `${BASE_URL}${url}`;

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
