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
 * In SSR context (server-side), uses INTERNAL_BACKEND_URL for Docker network communication
 * or falls back to PUBLIC_BACKEND_URL / localhost. Used by SSR API proxies and server utilities.
 * Client-side components make same-origin requests to Astro API routes (/api/*) rather than calling the backend directly.
 *
 * @example
 * // Local development
 * PUBLIC_BACKEND_URL=http://localhost:8080
 *
 * // Docker internal network (server-to-server)
 * INTERNAL_BACKEND_URL=http://backend:8080
 */
export const BACKEND_URL =
  import.meta.env.SSR && typeof process !== "undefined" && process.env.INTERNAL_BACKEND_URL
    ? process.env.INTERNAL_BACKEND_URL
    : import.meta.env.PUBLIC_BACKEND_URL || "http://127.0.0.1:8080";

/**
 * Default headers for all API requests
 * Always includes Content-Type: application/json
 */
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
} as const;
