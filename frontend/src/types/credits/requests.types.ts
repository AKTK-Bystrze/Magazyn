import type { PaginationMeta } from "../api.types";

export const CREDIT_REQUEST_STATUS = {
  AWAITING: "awaiting",
  APPROVED: "approved",
  REJECTED: "rejected",
  APPROVED_WITH_CHANGES: "approved with changes",
} as const;

export type CreditRequestStatus = typeof CREDIT_REQUEST_STATUS[keyof typeof CREDIT_REQUEST_STATUS];

/**
 * Credit request data transfer object representing a request for godzinki.
 */
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

/**
 * Data required to create a new credit request.
 */
export interface CreateCreditRequestDTO {
  title: string;
  description: string;
  credits_value: number;
  user_helped_id: string;
  helpers: string[];
}

/**
 * Data required to update an existing credit request.
 */
export interface UpdateCreditRequestDTO {
  title?: string;
  description?: string;
  credits_value?: number;
  user_helped_id?: string;
  helpers?: string[];
}

/**
 * Data required by an admin to approve or reject a credit request.
 */
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
  pagination: PaginationMeta;
}
