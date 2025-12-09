/**
 * Application routes configuration
 * Single source of truth for all route paths
 * 
 * This eliminates the 42 hardcoded route strings scattered across the codebase
 * and provides type-safe route references.
 */
export const ROUTES = {
  PUBLIC: {
    LOGIN: '/login',
  },
  PROTECTED: {
    ADMIN: '/admin',
    DASHBOARD: '/dashboard',
    ACCOUNT_DISABLED: '/account-disabled',
  },
} as const;

// Type-safe route types
export type AppRoute = PublicRoute | ProtectedRoute;
export type PublicRoute = typeof ROUTES.PUBLIC[keyof typeof ROUTES.PUBLIC];
export type ProtectedRoute = typeof ROUTES.PROTECTED[keyof typeof ROUTES.PROTECTED];

/**
 * Checks if a route is a public route (doesn't require authentication)
 */
export function isPublicRoute(path: string): path is PublicRoute {
  return Object.values(ROUTES.PUBLIC).includes(path as PublicRoute);
}

/**
 * Checks if a route is a protected route (requires authentication)
 */
export function isProtectedRoute(path: string): path is ProtectedRoute {
  return Object.values(ROUTES.PROTECTED).includes(path as ProtectedRoute);
}

/**
 * Gets all valid routes in the application
 */
export function getAllRoutes(): AppRoute[] {
  return [
    ...Object.values(ROUTES.PUBLIC),
    ...Object.values(ROUTES.PROTECTED),
  ];
}
