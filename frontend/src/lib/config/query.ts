import { QueryClient } from '@tanstack/react-query';

// React Query configuration constants
export const QUERY_STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const QUERY_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Default React Query configuration
 * Centralizes query behavior across the application
 */
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_CACHE_TIME,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
};

/**
 * Factory function to create a new QueryClient with default configuration
 */
export function createQueryClient() {
  return new QueryClient(queryConfig);
}
