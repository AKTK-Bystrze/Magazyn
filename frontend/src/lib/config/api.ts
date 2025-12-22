/**
 * Backend API Configuration
 * 
 * Centralizes all API communication settings to eliminate hardcoded URLs
 * and provide a single source of truth for backend communication.
 * 
 * @module lib/config/api
 */

/**
 * Backend API base URL
 * 
 * Reads from PUBLIC_BACKEND_URL environment variable with localhost fallback.
 * This should point to your Go backend API server.
 * 
 * @example
 * // Development
 * PUBLIC_BACKEND_URL=http://localhost:8080
 * 
 * // Production
 * PUBLIC_BACKEND_URL=https://api.yourdomain.com
 */
export const BACKEND_URL = (import.meta.env.SSR && import.meta.env.INTERNAL_BACKEND_URL)
  ? import.meta.env.INTERNAL_BACKEND_URL
  : (import.meta.env.PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080');

/**
 * Default headers for all API requests
 * Always includes Content-Type: application/json
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const;

/**
 * Builds headers object with Authorization token
 * 
 * @param token - Access token to include in Authorization header
 * @returns Headers object with Content-Type and Authorization
 * 
 * @example
 * const headers = getAuthHeaders(session.access_token);
 * // Returns: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token...' }
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return {
    ...DEFAULT_HEADERS,
    'Authorization': `Bearer ${token}`,
  };
}
