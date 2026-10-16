import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { RESERVATION_DATE_MODIFICATION_UI_STRINGS as UI } from "@/lib/config/constants";
import type { Reservation } from "@/types";
import type { DateRangeValidationErrors } from "@/types/reservation-cart.types";
import { useReservationDateAdjustment } from "@/hooks/useReservationDateAdjustment";
import { ReservationDateAdjustmentFields } from "./ReservationDateAdjustmentFields";

interface ModifyDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  reservations?: Reservation[];
  onConfirm: (newDates: { startDate: string; endDate: string }) => Promise<void>;
  isSubmitting: boolean;
  currentUserBalance: number;
}

/**
 * Dialog for modifying reservation dates without changing status.
 * Shows date picker, credit adjustment preview, and significant extension warning.
 *
 * Validates:
 * - End date must be >= start date
 * - Dates must be different from current dates
 * - User has sufficient credits for extensions
 *
 * @param open - Dialog open state
 * @param onOpenChange - Callback when dialog open state changes
 * @param reservation - Current reservation details (or representative if bulk)
 * @param reservations - List of reservations if bulk modify
 * @param onConfirm - Callback when user confirms date changes
 * @param isSubmitting - Loading state during API call
 * @param currentUserBalance - User's current credit balance
 */
export function ModifyDatesDialog({
  open,
  onOpenChange,
  reservation,
  reservations,
  onConfirm,
  isSubmitting,
  currentUserBalance,
}: ModifyDatesDialogProps) {
  const [startDate, setStartDate] = React.useState<string | null>(reservation.startDate);
  const [endDate, setEndDate] = React.useState<string | null>(reservation.endDate);
  const [validationErrors, setValidationErrors] = React.useState<DateRangeValidationErrors>({
    startDate: null,
    endDate: null,
  });
  const [apiError, setApiError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setStartDate(reservation.startDate);
      setEndDate(reservation.endDate);
      setValidationErrors({ startDate: null, endDate: null });
      setApiError(null);
    }
  }, [open, reservation.startDate, reservation.endDate]);

  const { newDays, totalCost, creditPerDay, adjustmentInfo, datesChanged } =
    useReservationDateAdjustment({
      reservation,
      reservations,
      startDate,
      endDate,
      currentUserBalance,
    });

  const validate = (): boolean => {
    const errors: DateRangeValidationErrors = {
      startDate: null,
      endDate: null,
    };

    if (!startDate) {
      errors.startDate = UI.START_DATE_REQUIRED;
    }

    if (!endDate) {
      errors.endDate = UI.END_DATE_REQUIRED;
    } else if (startDate && endDate < startDate) {
      errors.endDate = UI.END_DATE_MUST_BE_AFTER_START;
    }

    if (!datesChanged && startDate && endDate) {
      errors.startDate = UI.DATES_MUST_CHANGE;
    }

    if (adjustmentInfo.newBalance < 0) {
      errors.endDate = UI.INSUFFICIENT_CREDITS_WARNING.replace(
        "{amount}",
        Math.abs(adjustmentInfo.newBalance).toString()
      );
    }

    setValidationErrors(errors);
    return !errors.startDate && !errors.endDate;
  };

  const handleConfirm = async () => {
    if (!validate()) {
      return;
    }

    if (!startDate || !endDate) {
      return;
    }

    try {
      setApiError(null);
      await onConfirm({ startDate, endDate });
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Nie udało się zmienić dat rezerwacji";
      setApiError(errorMessage);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  const handleStartDateChange = React.useCallback((date: string | null) => {
    setStartDate(date);
    setValidationErrors({ startDate: null, endDate: null });
    setApiError(null);
  }, []);

  const handleEndDateChange = React.useCallback((date: string | null) => {
    setEndDate(date);
    setValidationErrors({ startDate: null, endDate: null });
    setApiError(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        data-testid="modify-dates-dialog"
      >
        <DialogHeader>
          <DialogTitle>{UI.MODIFY_DATES_TITLE}</DialogTitle>
          <DialogDescription>{UI.MODIFY_DATES_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <ReservationDateAdjustmentFields
            reservation={reservation}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            validationErrors={validationErrors}
            datesChanged={datesChanged}
            totalCost={totalCost}
            newDays={newDays}
            creditPerDay={creditPerDay}
            currentUserBalance={currentUserBalance}
            adjustmentInfo={adjustmentInfo}
          />

          {apiError && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertDescription className="text-destructive">{apiError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {UI.CANCEL_CHANGES}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !datesChanged || adjustmentInfo.newBalance < 0}
            data-testid="save-dates-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {UI.UPDATING_RESERVATION}
              </>
            ) : (
              UI.CONFIRM_CHANGES
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
