import { DEFAULT_HEADERS } from "@/lib/config/api";
import { supabase } from "@/lib/supabase";

/**
 * Builds headers for API requests with optional authentication
 * Eliminates duplicated header building logic
 */
async function buildHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

/**
 * Handles non-OK fetch responses by extracting error details and throwing an Error.
 *
 * @param response - The failed Response object
 * @throws Error with response message, status, and details
 */
export async function handleFetchError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({ error: "Network error" }));
  const message = errorData?.message || errorData?.error || "An error occurred";
  const error = new Error(message);
  (error as Error & { status?: number; details?: unknown }).status = response.status;
  (error as Error & { status?: number; details?: unknown }).details = errorData?.details;
  throw error;
}

async function request<T>(method: string, url: string, data?: unknown): Promise<{ data: T }> {
  const headers = await buildHeaders();
  const init: RequestInit = {
    method,
    headers,
    credentials: "include",
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  };

  const response = await fetch(url, init);
  if (!response.ok) {
    await handleFetchError(response);
  }

  const text = await response.text();
  const resData = text ? JSON.parse(text) : undefined;
  return { data: resData as T };
}

/**
 * Generic API client wrapper around fetch
 * Automatically handles headers and error parsing
 */
export const api = {
  post: <T>(url: string, data: unknown): Promise<{ data: T }> => request<T>("POST", url, data),

  get: <T>(
    url: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): Promise<{ data: T }> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return request<T>("GET", queryString ? `${url}?${queryString}` : url);
  },

  patch: <T>(url: string, data: unknown): Promise<{ data: T }> => request<T>("PATCH", url, data),

  put: <T>(url: string, data: unknown): Promise<{ data: T }> => request<T>("PUT", url, data),

  delete: <T = void>(url: string): Promise<{ data: T }> => request<T>("DELETE", url),
};
