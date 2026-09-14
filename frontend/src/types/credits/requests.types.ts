import type { Pagination } from "../common.types";

export type CreditRequestStatus = "awaiting" | "approved" | "rejected" | "approved with changes";

export interface CreditRequestDTO {
  id: string;
  title: string;
  description: string;
  credits_value: number;
  requestor_id: string | null;
  user_helped_id: string | null;
  status: CreditRequestStatus;
  created_at: string;
  updated_at: string;
  helpers: string[];
}

export interface CreateCreditRequestDTO {
  title: string;
  description: string;
  credits_value: number;
  user_helped_id: string;
  helpers: string[];
}

export interface UpdateCreditRequestDTO {
  title?: string;
  description?: string;
  credits_value?: number;
  user_helped_id?: string;
  helpers?: string[];
}

export interface ReviewCreditRequestDTO {
  credits_value?: number;
  helpers?: string[];
  status: CreditRequestStatus;
}

export interface UserCreditLeaderboardItem {
  user_id: string;
  username: string;
  total_credits: number;
}

export interface CreditRequestListResponse {
  requests: CreditRequestDTO[];
  pagination: Pagination;
}
