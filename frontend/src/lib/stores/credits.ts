import { atom } from "nanostores";
import { creditsApi } from "@/lib/api/credits-api";
import { defaultLogger as logger } from "@/lib/utils/logger";

/**
 * Reactive atom holding the authenticated user's current credit balance.
 * Null indicates uninitialized state.
 */
export const $creditBalance = atom<number | null>(null);

/**
 * Tracks an in-flight refresh request to prevent duplicate concurrent API calls.
 */
let activeRefreshPromise: Promise<number | null> | null = null;

/**
 * Initializes the credit balance store from an initial value (e.g., SSR sessionInfo).
 * Only sets the value if the store is currently null.
 *
 * @param initialBalance - Optional initial balance passed from SSR
 */
export function initCreditBalance(initialBalance?: number): void {
  if (initialBalance !== undefined && $creditBalance.get() === null) {
    $creditBalance.set(initialBalance);
  }
}

/**
 * Resets the credit balance store to uninitialized null state.
 * Clears any in-flight refresh promise.
 */
export function resetCreditBalance(): void {
  activeRefreshPromise = null;
  $creditBalance.set(null);
}

/**
 * Directly updates the credit balance in the store (e.g., from mutation responses).
 *
 * @param balance - New credit balance to store
 */
export function setCreditBalance(balance: number): void {
  $creditBalance.set(balance);
}

/**
 * Synchronously retrieves the current credit balance from the store.
 *
 * @returns Current credit balance number, or null if uninitialized
 */
export function getCreditBalance(): number | null {
  return $creditBalance.get();
}

/**
 * Asynchronously refreshes the user's credit balance from the backend API.
 * Deduplicates concurrent calls and catches errors gracefully.
 *
 * @returns The updated balance, or the previous balance if the fetch fails
 */
export async function refreshCreditBalance(): Promise<number | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const history = await creditsApi.getHistory({ page: 1, perPage: 1 });
      if (typeof history.currentBalance === "number") {
        $creditBalance.set(history.currentBalance);
        return history.currentBalance;
      }
    } catch (error) {
      logger.error("Failed to refresh credit balance", { error });
    } finally {
      activeRefreshPromise = null;
    }
    return $creditBalance.get();
  })();

  return activeRefreshPromise;
}
