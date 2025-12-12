// =============================================================================
// CREDIT HISTORY TYPES
// =============================================================================

import type { Enums } from "../../db/database.types";
import type { PaginationMeta } from "../api.types";

/**
 * Credit transaction record
 * From credit_history table
 */
export type CreditHistoryItem = {
  id: string;
  userId: string; // from credit_history.user_id
  username: string; // from profiles.username (JOIN)
  amount: number; // negative for charges, positive for credits
  reason: Enums<"credit_transaction_reason">;
  description: string | null;
  reservationId: string | null;
  adminId: string | null;
  adminUsername: string | null; // from admin_id → profiles.username
  createdAt: string;
};

/**
 * Credit history with current balance (GET /credit-history)
 */
export type CreditHistoryResponse = {
  creditHistory: CreditHistoryItem[];
  pagination: PaginationMeta;
  currentBalance: number;
};
