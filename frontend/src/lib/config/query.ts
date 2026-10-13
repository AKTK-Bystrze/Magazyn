import { QueryClient } from "@tanstack/react-query";
import { QUERY_STALE_TIME_MS } from "./constants/app";

/** Standard stale time for React Query queries (1 minute in ms) */
export const QUERY_STALE_TIME = QUERY_STALE_TIME_MS;

/** Standard cache garbage collection time for React Query (10 minutes in ms) */
export const QUERY_CACHE_TIME = 10 * 60 * 1000;

/**
 * Standard React Query configuration.
 * Centralizes query caching and refetching defaults across the application.
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
 * Factory function to create a new QueryClient with application default configuration.
 *
 * @returns Configured QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient(queryConfig);
}

/**
 * Shared pagination helper for TanStack React Query infinite queries.
 * Calculates next page number from a standard paginated response envelope.
 *
 * @param lastPage - Last page response containing pagination metadata
 * @returns Next page number if more pages are available, or undefined if at the last page
 */
export function getNextPageParam(lastPage: {
  pagination?: {
    page: number;
    totalPages?: number;
    total_pages?: number;
  };
}): number | undefined {
  if (!lastPage.pagination) return undefined;
  const currentPage = lastPage.pagination.page;
  const totalPages = lastPage.pagination.totalPages ?? lastPage.pagination.total_pages ?? 0;
  return currentPage < totalPages ? currentPage + 1 : undefined;
}
