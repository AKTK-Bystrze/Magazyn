import { api } from "./client";
import type {
  CreditRequestDTO,
  CreateCreditRequestDTO,
  UpdateCreditRequestDTO,
  ReviewCreditRequestDTO,
  UserCreditLeaderboardItem,
  CreditRequestListResponse,
} from "@/types/credits/requests.types";

export const creditRequestsApi = {
  getRequests: async (params: {
    page?: number;
    perPage?: number;
  }): Promise<CreditRequestListResponse> => {
    const { data } = await api.get<CreditRequestListResponse>("/api/credits/requests", {
      page: params.page,
      per_page: params.perPage,
    });
    return data;
  },

  createRequest: async (payload: CreateCreditRequestDTO): Promise<CreditRequestDTO> => {
    const { data } = await api.post<CreditRequestDTO>("/api/credits/requests", payload);
    return data;
  },

  updateRequest: async (id: string, payload: UpdateCreditRequestDTO): Promise<CreditRequestDTO> => {
    const { data } = await api.put<CreditRequestDTO>(`/api/credits/requests/${id}`, payload);
    return data;
  },

  reviewRequest: async (id: string, payload: ReviewCreditRequestDTO): Promise<void> => {
    await api.patch(`/api/credits/requests/${id}/status`, payload);
  },

  getLeaderboard: async (): Promise<UserCreditLeaderboardItem[]> => {
    const { data } = await api.get<UserCreditLeaderboardItem[]>("/api/users/credits");
    return data;
  },
};
