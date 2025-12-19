import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { creditsApi } from "@/lib/api/credits-api";
import type { CreditHistoryResponse } from "@/types";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  QUERY_STALE_TIME_MS,
} from "@/lib/config/constants";

/**
 * Query key factory for credit history
 */
const QUERY_KEYS = {
  all: ["credits"] as const,
  history: (page: number, perPage: number) =>
    [...QUERY_KEYS.all, "history", page, perPage] as const,
};

/**
 * Hook for managing credit history data and pagination state
 *
 * @returns Credit history data, loading state, and pagination controls
 */
export function useCreditHistory() {
  const [page, setPage] = React.useState(DEFAULT_PAGE);
  const [perPage, setPerPage] = React.useState(DEFAULT_PAGE_SIZE);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isPlaceholderData,
  } = useQuery<CreditHistoryResponse>({
    queryKey: QUERY_KEYS.history(page, perPage),
    queryFn: () => creditsApi.getHistory({ page, perPage }),
    staleTime: QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  });

  const setPageHandler = React.useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const setPerPageHandler = React.useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when changing page size
  }, []);

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    page,
    perPage,
    setPage: setPageHandler,
    setPerPage: setPerPageHandler,
    refetch,
    isPlaceholderData,
  };
}
