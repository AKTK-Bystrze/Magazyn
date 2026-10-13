import type { Enums } from "../../db/database.types";
import type { PaginationMeta } from "../api.types";

/**
 * Credit transaction record
 * From credit_history table
 */
export type CreditHistoryItem = {
  id: string;
  /** ID of the user whose balance was changed */
  userId: string;
  /** Username joined from profiles table */
  username: string;
  /** Amount in credits. Negative for charges/deductions, positive for refunds/credits. */
  amount: number;
  reason: Enums<"credit_transaction_reason">;
  description: string | null;
  reservationId: string | null;
  /** ID of the admin or system user who performed the action, if applicable */
  authorId: string | null;
  /** Username of the author joined from profiles table */
  authorUsername: string | null;
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
