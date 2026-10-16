import * as React from "react";
import { DateRangePicker } from "./DateRangePicker";
import { CreditAdjustmentPreview } from "./CreditAdjustmentPreview";
import { SignificantExtensionWarning } from "./SignificantExtensionWarning";
import type { Reservation, CreditAdjustmentInfo } from "@/types";
import type { DateRangeValidationErrors } from "@/types/reservation-cart.types";

/**
 * Props for the ReservationDateAdjustmentFields component.
 */
export interface ReservationDateAdjustmentFieldsProps {
  /** The reference reservation being modified */
  reservation: Reservation;
  /** Currently selected start date */
  startDate: string | null;
  /** Currently selected end date */
  endDate: string | null;
  /** Callback when start date changes */
  onStartDateChange: (date: string | null) => void;
  /** Callback when end date changes */
  onEndDateChange: (date: string | null) => void;
  /** Validation errors for the date range */
  validationErrors: DateRangeValidationErrors;
  /** Whether the dates have changed from the original reservation */
  datesChanged: boolean;
  /** Total original credit cost */
  totalCost: number;
  /** Number of days in the new date range */
  newDays: number;
  /** Credit rate per day */
  creditPerDay: number;
  /** User's current credit balance */
  currentUserBalance: number;
  /** Calculated credit adjustment information */
  adjustmentInfo: CreditAdjustmentInfo;
}

/**
 * Shared component rendering date range picker, credit adjustment preview, and significant extension warning.
 * Consolidates duplicate date modification UI between ModifyDatesDialog and ReturnWithDatesDialog.
 */
export function ReservationDateAdjustmentFields({
  reservation,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  validationErrors,
  datesChanged,
  totalCost,
  newDays,
  creditPerDay,
  currentUserBalance,
  adjustmentInfo,
}: ReservationDateAdjustmentFieldsProps) {
  return (
    <>
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        validationErrors={validationErrors}
        title={null}
        compact={true}
        allowPastDates={true}
      />

      {datesChanged && startDate && endDate && (
        <>
          <CreditAdjustmentPreview
            originalDates={{
              startDate: reservation.startDate,
              endDate: reservation.endDate,
            }}
            newDates={{ startDate, endDate }}
            originalCreditCost={totalCost}
            newCreditCost={newDays * creditPerDay}
            currentBalance={currentUserBalance}
          />

          <SignificantExtensionWarning creditAdjustment={adjustmentInfo.adjustment} />
        </>
      )}
    </>
  );
}
