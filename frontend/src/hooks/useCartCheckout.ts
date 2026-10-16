import * as React from "react";
import { supabase } from "@/lib/supabase";
import type { CartState } from "@/types/reservation-cart.types";
import type { CreateReservationsCommand } from "@/types";
import { transformCreateReservationsCommand } from "@/lib/transformers/reservation.transformer";
import { ROUTES } from "@/lib/config/routes";
import { defaultLogger as logger } from "@/lib/utils/logger";

/**
 * Options for the useCartCheckout hook.
 */
export interface UseCartCheckoutOptions {
  cartState: CartState;
  clearCart: () => void;
  isAdmin?: boolean;
  selectedUserId?: string | null;
  isFreeReservation?: boolean;
  setIsFreeReservation?: (value: boolean) => void;
  successRedirectPath?: string;
  onSuccess?: () => void;
}

/**
 * Return type for the useCartCheckout hook.
 */
export interface UseCartCheckoutReturn {
  isSubmitting: boolean;
  submissionError: string | null;
  setSubmissionError: React.Dispatch<React.SetStateAction<string | null>>;
  submitReservation: () => Promise<boolean>;
}

/**
 * Custom React hook for handling cart checkout and reservation creation.
 * Encapsulates Supabase session retrieval, POST /api/reservations submission,
 * error parsing and equipment name resolution, and post-submission redirection.
 *
 * @param options - Configuration options for checkout execution
 * @returns State and submit handler for checkout
 */
export function useCartCheckout({
  cartState,
  clearCart,
  isAdmin = false,
  selectedUserId = null,
  isFreeReservation = false,
  setIsFreeReservation,
  successRedirectPath = ROUTES.PROTECTED.RESERVATIONS,
  onSuccess,
}: UseCartCheckoutOptions): UseCartCheckoutReturn {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);

  const submitReservation = async (): Promise<boolean> => {
    if (!cartState.startDate || !cartState.endDate) return false;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const command: CreateReservationsCommand = {
        reservations: cartState.items.map((item) => ({
          equipmentId: item.equipmentId,
          startDate: cartState.startDate!,
          endDate: cartState.endDate!,
        })),
        ...(isAdmin && selectedUserId && { userId: selectedUserId }),
        ...(isAdmin && isFreeReservation && { freeReservation: true }),
      };

      const backendCommand = transformCreateReservationsCommand(command);

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers,
        body: JSON.stringify(backendCommand),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.message || errorData.error || "Failed to create reservation";

        cartState.items.forEach((item) => {
          if (errorMessage.includes(item.equipmentId)) {
            errorMessage = errorMessage.replace(item.equipmentId, `"${item.name}"`);
          }
        });

        if (errorMessage.includes("Conflict detected")) {
          errorMessage = errorMessage.replace(
            "Conflict detected for equipment",
            "This equipment is already reserved:"
          );
        }

        throw new Error(errorMessage);
      }

      await response.json();

      clearCart();
      setIsFreeReservation?.(false);
      onSuccess?.();

      window.location.href = `${successRedirectPath}?success=true`;
      return true;
    } catch (error) {
      logger.error("Reservation failed:", { error });
      setSubmissionError(error instanceof Error ? error.message : "An unexpected error occurred");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submissionError,
    setSubmissionError,
    submitReservation,
  };
}
