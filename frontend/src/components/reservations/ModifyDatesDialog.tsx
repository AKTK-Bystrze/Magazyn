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
import { DateRangePicker } from "./DateRangePicker";
import { CreditAdjustmentPreview } from "./CreditAdjustmentPreview";
import { SignificantExtensionWarning } from "./SignificantExtensionWarning";
import { Loader2 } from "lucide-react";
import { calculateDays } from "@/lib/utils/date-utils";
import { calculateCreditAdjustment } from "@/lib/utils/credit-utils";
import { RESERVATION_DATE_MODIFICATION_UI_STRINGS as UI } from "@/lib/config/constants";
import type { Reservation } from "@/types";
import type { DateRangeValidationErrors } from "@/types/reservation-cart.types";

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
 * Dialog for modifying reservation dates without changing status
 * Shows date picker, credit adjustment preview, and significant extension warning
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
  const [startDate, setStartDate] = React.useState(reservation.startDate);
  const [endDate, setEndDate] = React.useState(reservation.endDate);
  const [validationErrors, setValidationErrors] = React.useState<DateRangeValidationErrors>({
    startDate: null,
    endDate: null,
  });
  const [apiError, setApiError] = React.useState<string | null>(null);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setStartDate(reservation.startDate);
      setEndDate(reservation.endDate);
      setValidationErrors({ startDate: null, endDate: null });
      setApiError(null);
    }
  }, [open, reservation.startDate, reservation.endDate]);

  // Calculate credit adjustment info
  const originalDays = calculateDays(reservation.startDate, reservation.endDate);
  const newDays = startDate && endDate ? calculateDays(startDate, endDate) : originalDays;

  // Handle bulk or single cost
  const totalCost = reservations?.length
    ? reservations.reduce((sum, r) => sum + r.creditCost, 0)
    : reservation.creditCost;

  // Get total credit per day
  const creditPerDay = totalCost / originalDays;

  const adjustmentInfo = calculateCreditAdjustment(
    originalDays,
    newDays,
    creditPerDay,
    currentUserBalance
  );

  // Check if dates have changed
  const datesChanged = startDate !== reservation.startDate || endDate !== reservation.endDate;

  // Validate dates
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

    // Check sufficient credits
    if (adjustmentInfo.newBalance < 0) {
      errors.endDate = UI.INSUFFICIENT_CREDITS_WARNING.replace(
        "{amount}",
        Math.abs(adjustmentInfo.newBalance).toString()
      );
    }

    setValidationErrors(errors);
    return !Object.values(errors).some((error) => error !== null);
  };

  // Handle confirm
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
          : "Failed to modify reservation dates";
      setApiError(errorMessage);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  // Validate on date change
  React.useEffect(() => {
    if (startDate && endDate) {
      // Clear errors when user changes dates
      setValidationErrors({ startDate: null, endDate: null });
      setApiError(null);
    }
  }, [startDate, endDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{UI.MODIFY_DATES_TITLE}</DialogTitle>
          <DialogDescription>{UI.MODIFY_DATES_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range Picker */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            validationErrors={validationErrors}
            title={null}
            compact={true}
            allowPastDates={true}
          />

          {/* Credit Adjustment Preview */}
          {datesChanged && startDate && endDate && (
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
          )}

          {/* Credit Adjustment Info */}
          {datesChanged && startDate && endDate && (
            <SignificantExtensionWarning creditAdjustment={adjustmentInfo.adjustment} />
          )}

          {/* API Error */}
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
