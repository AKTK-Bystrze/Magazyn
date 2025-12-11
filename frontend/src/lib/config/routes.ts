/**
 * Application Routes Configuration
 * 
 * Single source of truth for all route paths in the application.
 * Provides type-safe route references and eliminates hardcoded path strings.
 * 
 * @module lib/config/routes
 */

/**
 * Application route constants organized by access level
 * 
 * @example
 * import { ROUTES } from '@/lib/config/routes';
 * 
 * // Use in redirects
 * return Astro.redirect(ROUTES.PUBLIC.LOGIN);
 * 
 * // Use in links
 * <a href={ROUTES.PROTECTED.ADMIN}>Admin</a>
 */
export const ROUTES = {
  PUBLIC: {
    LOGIN: '/login',
    EQUIPMENT: '/equipment',
  },
  PROTECTED: {
    ADMIN: '/admin',
    DASHBOARD: '/dashboard',
    ACCOUNT_DISABLED: '/account-disabled',
    CREDIT_REQUESTS: '/credit-requests',
  },
} as const;

/**
 * Type representing any public route
 */
export type PublicRoute = typeof ROUTES.PUBLIC[keyof typeof ROUTES.PUBLIC];

/**
 * Type representing any protected route (requires authentication)
 */
export type ProtectedRoute = typeof ROUTES.PROTECTED[keyof typeof ROUTES.PROTECTED];

/**
 * Type representing any application route
 */
export type AppRoute = PublicRoute | ProtectedRoute;

/**
 * Checks if a route is public (doesn't require authentication)
 * 
 * @param path - The path to check
 * @returns true if the path is a public route
 */
export function isPublicRoute(path: string): path is PublicRoute {
  return Object.values(ROUTES.PUBLIC).includes(path as PublicRoute);
}

/**
 * Checks if a route requires authentication
 * 
 * @param path - The path to check
 * @returns true if the path is a protected route
 */
export function isProtectedRoute(path: string): path is ProtectedRoute {
  return Object.values(ROUTES.PROTECTED).includes(path as ProtectedRoute);
}

/**
 * Gets all valid routes in the application
 * 
 * @returns Array of all registered routes
 */
export function getAllRoutes(): AppRoute[] {
  return [
    ...Object.values(ROUTES.PUBLIC),
    ...Object.values(ROUTES.PROTECTED),
  ];
}
