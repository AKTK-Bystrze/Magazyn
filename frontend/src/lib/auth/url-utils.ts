/**
 * URL utility functions for redirect validation and path normalization
 * Prevents open redirect attacks (OWASP A1:2021)
 */
import { getAllRoutes } from '../config/routes';

/**
 * Normalizes a path by removing trailing slash
 * Prevents path comparison issues in redirect logic
 * 
 * @param path - The path to normalize
 * @returns Normalized path, always starting with '/', never ending with '/' (except for root)
 * 
 * @example
 * normalizePath('/admin/') // '/admin'
 * normalizePath('/') // '/'
 * normalizePath('') // '/'
 */
export function normalizePath(path: string): string {
  const trimmed = path.replace(/\/$/, '');
  return trimmed || '/';
}

/**
 * Validates that a redirect URL is safe (internal to the application)
 * Prevents open redirect attacks (OWASP A1:2021)
 * 
 * @param url - The URL to validate
 * @param origin - The application origin (e.g., 'http://localhost:4321')
 * @returns true if the URL is safe to redirect to, false otherwise
 * 
 * @example
 * isSafeRedirect('/admin', 'http://localhost:4321') // true
 * isSafeRedirect('https://evil.com', 'http://localhost:4321') // false
 */
export function isSafeRedirect(url: string, origin: string): boolean {
  try {
    // Parse the URL - if relative, it will be resolved against origin
    const parsed = new URL(url, origin);
    
    // Must be same origin (prevents external redirects)
    if (parsed.origin !== origin) {
      console.warn(`🚨 Blocked external redirect attempt: ${url}`);
      return false;
    }
    
    // Must be in allowed paths
    const isAllowed = isAllowedPath(parsed.pathname);
    if (!isAllowed) {
      console.warn(`🚨 Blocked redirect to non-whitelisted path: ${parsed.pathname}`);
    }
    
    return isAllowed;
  } catch (error) {
    console.error(`🚨 Invalid URL in redirect validation: ${url}`, error);
    return false;
  }
}

/**
 * Checks if a path is in the whitelist of allowed redirect targets
 * 
 * @param path - The pathname to check (e.g., '/admin')
 * @returns true if the path is whitelisted, false otherwise
 */
function isAllowedPath(path: string): boolean {
  const allowedPaths = getAllRoutes();
  return allowedPaths.includes(path as any);
}

/**
 * Validates and sanitizes a redirect URL from user input
 * Returns the safe URL or a default fallback
 * 
 * This is the main function to use when processing redirect parameters
 * from query strings or other user input.
 * 
 * @param url - The URL to validate (can be null)
 * @param origin - The application origin
 * @param fallback - The fallback route if validation fails
 * @returns A safe redirect URL
 * 
 * @example
 * // User tries to redirect to external site
 * validateRedirectUrl('https://evil.com', origin, '/dashboard')
 * // Returns: '/dashboard' (fallback)
 * 
 * // User provides valid internal route
 * validateRedirectUrl('/admin', origin, '/dashboard')
 * // Returns: '/admin'
 */
export function validateRedirectUrl(
  url: string | null,
  origin: string,
  fallback: string = '/login'
): string {
  // Null, empty, or root path -> use fallback
  if (!url || url === '/' || url === '/login') {
    return fallback;
  }
  
  // Validate the URL
  return isSafeRedirect(url, origin) ? url : fallback;
}
