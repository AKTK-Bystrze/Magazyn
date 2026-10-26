import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { creditsApi } from "@/lib/api/credits-api";
import { QUERY_STALE_TIME_MS } from "@/lib/config/constants";

/**
 * Query key for user credit balance queries
 */
export const USER_CREDIT_BALANCE_KEY = ["credits", "balance"] as const;

/**
 * Return type for useUserCreditBalance hook
 */
export interface UseUserCreditBalanceReturn {
  /** Current credit balance, or initial balance while fetching */
  creditBalance: number | undefined;
  /** Whether the query is in loading state without cached/placeholder data */
  isLoading: boolean;
  /** Whether a background query fetch is in progress */
  isFetching: boolean;
  /** Function to trigger a manual refetch */
  refetch: () => Promise<unknown>;
  /** Function to invalidate the balance query and trigger auto-refetch */
  invalidateBalance: () => Promise<void>;
}

/**
 * Hook for managing the authenticated user's credit balance with TanStack Query.
 *
 * Uses placeholderData to render initial SSR balance immediately without layout shift,
 * while refetching the latest actual balance from the database in the background.
 *
 * @param initialBalance - Optional initial balance passed from SSR
 * @param enabled - Whether the query is enabled (defaults to true)
 * @returns Object containing current credit balance, status flags, and refetch handlers
 */
export function useUserCreditBalance(
  initialBalance?: number,
  enabled = true
): UseUserCreditBalanceReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: USER_CREDIT_BALANCE_KEY,
    queryFn: async () => {
      const history = await creditsApi.getHistory({ page: 1, perPage: 1 });
      return history.currentBalance;
    },
    placeholderData: initialBalance,
    staleTime: QUERY_STALE_TIME_MS,
    enabled,
  });

  const invalidateBalance = React.useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: USER_CREDIT_BALANCE_KEY });
  }, [queryClient]);

  return {
    creditBalance: query.data ?? initialBalance,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    invalidateBalance,
  };
}
