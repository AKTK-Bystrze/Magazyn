import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { creditsApi } from "@/lib/api/credits-api";
import { DEFAULT_PAGE_SIZE, QUERY_STALE_TIME_MS } from "@/lib/config/constants";

/**
 * Query key factory for credit history
 */
const QUERY_KEYS = {
  all: ["credits"] as const,
  history: (perPage: number) => [...QUERY_KEYS.all, "history", "infinite", perPage] as const,
};

/**
 * Hook for managing credit history data and pagination state
 *
 * @returns Credit history data, loading state, and pagination controls
 */
export function useCreditHistory() {
  const [perPage, setPerPage] = React.useState(DEFAULT_PAGE_SIZE);

  const {
    data: infiniteData,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.history(perPage),
    queryFn: ({ pageParam = 1 }) => creditsApi.getHistory({ page: pageParam, perPage }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: QUERY_STALE_TIME_MS,
  });

  const setPerPageHandler = React.useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
  }, []);

  const data = React.useMemo(() => {
    if (!infiniteData) return undefined;
    return {
      history: infiniteData.pages.flatMap((page) => page.creditHistory),
      pagination: infiniteData.pages[0].pagination,
      currentBalance: infiniteData.pages[0].currentBalance,
    };
  }, [infiniteData]);

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    perPage,
    setPerPage: setPerPageHandler,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
