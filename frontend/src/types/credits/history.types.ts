import type { Enums } from "../../db/database.types";
import type { PaginationMeta } from "../api.types";

/**
 * Credit transaction record
 * From credit_history table
 */
export type CreditHistoryItem = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  reason: Enums<"credit_transaction_reason">;
  description: string | null;
  reservationId: string | null;
  authorId: string | null;
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
