import * as React from "react";
import { calculateDays } from "@/lib/utils/date-utils";
import { calculateCreditAdjustment } from "@/lib/utils/credit-utils";
import type { Reservation, CreditAdjustmentInfo } from "@/types";

/**
 * Options for the useReservationDateAdjustment hook.
 */
export interface UseReservationDateAdjustmentOptions {
  /** The reference reservation being modified */
  reservation: Reservation;
  /** Optional batch reservations list for bulk cost calculation */
  reservations?: Reservation[];
  /** Proposed new start date string */
  startDate: string | null;
  /** Proposed new end date string */
  endDate: string | null;
  /** Current user credit balance */
  currentUserBalance: number;
}

/**
 * Return type for the useReservationDateAdjustment hook.
 */
export interface UseReservationDateAdjustmentReturn {
  /** Number of days in the original reservation */
  originalDays: number;
  /** Number of days in the proposed new reservation range */
  newDays: number;
  /** Total original credit cost (summed if bulk) */
  totalCost: number;
  /** Credit rate per day */
  creditPerDay: number;
  /** Calculated credit adjustment details */
  adjustmentInfo: CreditAdjustmentInfo;
  /** Whether start or end dates differ from original reservation */
  datesChanged: boolean;
}

/**
 * Custom React hook for calculating reservation date changes and credit adjustments.
 * Consolidates duplicated calculation logic across ModifyDatesDialog and ReturnWithDatesDialog.
 */
export function useReservationDateAdjustment({
  reservation,
  reservations,
  startDate,
  endDate,
  currentUserBalance,
}: UseReservationDateAdjustmentOptions): UseReservationDateAdjustmentReturn {
  return React.useMemo(() => {
    const originalDays = calculateDays(reservation.startDate, reservation.endDate);
    const newDays = startDate && endDate ? calculateDays(startDate, endDate) : originalDays;

    const totalCost = reservations?.length
      ? reservations.reduce((sum, r) => sum + r.creditCost, 0)
      : reservation.creditCost;

    const creditPerDay = originalDays > 0 ? totalCost / originalDays : 0;

    const adjustmentInfo = calculateCreditAdjustment(
      originalDays,
      newDays,
      creditPerDay,
      currentUserBalance
    );

    const datesChanged =
      Boolean(startDate && endDate) &&
      (startDate !== reservation.startDate || endDate !== reservation.endDate);

    return {
      originalDays,
      newDays,
      totalCost,
      creditPerDay,
      adjustmentInfo,
      datesChanged,
    };
  }, [reservation, reservations, startDate, endDate, currentUserBalance]);
}
