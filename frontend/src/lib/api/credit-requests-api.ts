import { api } from "./client";
import {
  transformCreditRequestList,
  transformCreditRequest,
  transformLeaderboard,
  transformCreateCommand,
  transformUpdateCommand,
  transformReviewCommand,
} from "@/lib/transformers/credit-request.transformer";
import type {
  CreditRequest,
  CreditRequestListResponse,
  LeaderboardItem,
  CreateCreditRequestCommand,
  UpdateCreditRequestCommand,
  ReviewCreditRequestCommand,
} from "@/types";

export const creditRequestsApi = {
  getRequests: async (params: {
    page?: number;
    perPage?: number;
  }): Promise<CreditRequestListResponse> => {
    const { data } = await api.get<unknown>("/api/credits/requests", {
      page: params.page,
      per_page: params.perPage,
    });
    return transformCreditRequestList(data);
  },

  createRequest: async (cmd: CreateCreditRequestCommand): Promise<CreditRequest> => {
    const { data } = await api.post<unknown>("/api/credits/requests", transformCreateCommand(cmd));
    return transformCreditRequest(data as never);
  },

  updateRequest: async (id: string, cmd: UpdateCreditRequestCommand): Promise<CreditRequest> => {
    const { data } = await api.put<unknown>(
      `/api/credits/requests/${id}`,
      transformUpdateCommand(cmd)
    );
    return transformCreditRequest(data as never);
  },

  reviewRequest: async (id: string, cmd: ReviewCreditRequestCommand): Promise<void> => {
    await api.patch(`/api/credits/requests/${id}/status`, transformReviewCommand(cmd));
  },

  getLeaderboard: async (): Promise<LeaderboardItem[]> => {
    const { data } = await api.get<unknown>("/api/users/credits");
    return transformLeaderboard(data);
  },
};
