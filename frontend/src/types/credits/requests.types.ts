// =============================================================================
// CREDIT REQUEST TYPES
// =============================================================================

import type { Enums } from "../../db/database.types";

/**
 * Credit request with status
 * From credit_requests table
 */
export type CreditRequest = {
  id: string;
  userId: string;
  username: string; // from profiles.username
  amount: number;
  description: string;
  status: Enums<"credit_request_status">;
  adminId: string | null;
  adminUsername: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string | null;
};

/**
 * Credit request with approved amount (for responses)
 */
export type CreditRequestWithApproval = CreditRequest & {
  approvedAmount?: number;
};

/**
 * Command to create credit request (POST /credit-requests)
 */
export type CreateCreditRequestCommand = {
  amount: number; // must be > 0
  description: string; // min 10 chars, max 500
};

/**
 * Command to approve/deny credit request (PATCH /credit-requests/:id)
 */
export type UpdateCreditRequestCommand = {
  status: "APPROVED" | "DENIED";
  approvedAmount?: number; // required if status=APPROVED
  adminNote?: string;
};
