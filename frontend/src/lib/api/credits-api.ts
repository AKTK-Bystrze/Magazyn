import { api } from "./client";
import type { CreditHistoryResponse } from "@/types";
import { transformCreditHistoryResponse } from "@/lib/transformers/credit.transformer";

/**
 * API client for credit-related endpoints
 */
export const creditsApi = {
  /**
   * Fetches paginated credit history for the authenticated user
   *
   * @param params - Pagination parameters (page, perPage)
   * @returns Paginated credit history items and current balance
   */
  getHistory: async (params: { page: number; perPage: number }): Promise<CreditHistoryResponse> => {
    const { data } = await api.get<unknown>("/api/credit-history", {
      page: params.page,
      per_page: params.perPage,
    });
    return transformCreditHistoryResponse(data);
  },
};
