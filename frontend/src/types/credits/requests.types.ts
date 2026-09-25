import type { PaginationMeta } from "../api.types";

export const CREDIT_REQUEST_STATUS = {
  AWAITING: "awaiting",
  APPROVED: "approved",
  REJECTED: "rejected",
  APPROVED_WITH_CHANGES: "approved with changes",
} as const;

export type CreditRequestStatus =
  (typeof CREDIT_REQUEST_STATUS)[keyof typeof CREDIT_REQUEST_STATUS];

/**
 * Credit request data transfer object representing a request for godzinki.
 */
export interface CreditRequest {
  id: string;
  title: string;
  description: string;
  creditsValue: number;
  requestorId: string | null;
  userHelpedId: string | null;
  status: CreditRequestStatus;
  createdAt: string;
  updatedAt: string;
  helpers: string[];
}

/**
 * Data required to create a new credit request.
 */
export interface CreateCreditRequestCommand {
  title: string;
  description: string;
  creditsValue: number;
  userHelpedId: string;
  helpers: string[];
}

/**
 * Data required to update an existing credit request.
 */
export interface UpdateCreditRequestCommand {
  title?: string;
  description?: string;
  creditsValue?: number;
  userHelpedId?: string;
  helpers?: string[];
}

/**
 * Data required by an admin to approve or reject a credit request.
 */
export interface ReviewCreditRequestCommand {
  creditsValue?: number;
  helpers?: string[];
  status: CreditRequestStatus;
}

export interface LeaderboardItem {
  userId: string;
  username: string;
  totalCredits: number;
}

export interface CreditRequestListResponse {
  requests: CreditRequest[];
  pagination: PaginationMeta;
}
