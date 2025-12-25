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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateRangePicker } from "./DateRangePicker";
import { CreditAdjustmentPreview } from "./CreditAdjustmentPreview";
import { SignificantExtensionWarning } from "./SignificantExtensionWarning";
import { Loader2, AlertTriangle } from "lucide-react";
import { calculateDays } from "@/lib/utils/date-utils";
import { calculateCreditAdjustment } from "@/lib/utils/credit-utils";
import { RESERVATION_DATE_MODIFICATION_UI_STRINGS as UI } from "@/lib/config/constants";
import type { Reservation } from "@/types";
import type { DateRangeValidationErrors } from "@/types/reservation-cart.types";
import type { UpdateReservationCommand } from "@/types/reservations/reservation.types";

interface ReturnWithDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  reservations?: Reservation[];
  onConfirm: (command: UpdateReservationCommand) => Promise<void>;
  isSubmitting: boolean;
  currentUserBalance: number;
}

/**
 * Dialog for marking a reservation as RETURNED with optional date modification.
 * Combines status change confirmation with optional date picker.
 *
 * @param open - Dialog open state
 * @param onOpenChange - Callback when dialog open state changes
 * @param reservation - Current reservation details (or representative)
 * @param reservations - List of reservations if bulk return
 * @param onConfirm - Callback when user confirms return (with or without dates)
 * @param isSubmitting - Loading state during API call
 * @param currentUserBalance - User's current credit balance
 */
export function ReturnWithDatesDialog({
  open,
  onOpenChange,
  reservation,
  reservations,
  onConfirm,
  isSubmitting,
  currentUserBalance,
}: ReturnWithDatesDialogProps) {
  const [modifyDates, setModifyDates] = React.useState(false);
  const [startDate, setStartDate] = React.useState<string | null>(
    reservation.startDate
  );
  const [endDate, setEndDate] = React.useState<string | null>(
    reservation.endDate
  );
  const [validationErrors, setValidationErrors] =
    React.useState<DateRangeValidationErrors>({
      startDate: null,
      endDate: null,
    });
  const [apiError, setApiError] = React.useState<string | null>(null);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setModifyDates(false);
      setStartDate(reservation.startDate);
      setEndDate(reservation.endDate);
      setValidationErrors({ startDate: null, endDate: null });
      setApiError(null);
    }
  }, [open, reservation]);

  // Calculations for credit adjustment
  const originalDays = calculateDays(
    reservation.startDate,
    reservation.endDate
  );
  const newDays =
    startDate && endDate ? calculateDays(startDate, endDate) : originalDays;

  // Handle bulk or single cost
  const totalCost = reservations?.length
    ? reservations.reduce((sum, r) => sum + r.creditCost, 0)
    : reservation.creditCost;

  const creditPerDay = totalCost / originalDays;

  const adjustmentInfo = calculateCreditAdjustment(
    originalDays,
    newDays,
    creditPerDay,
    currentUserBalance
  );

  // Check if dates have actually changed
  const datesChanged =
    startDate !== reservation.startDate || endDate !== reservation.endDate;

  // Validate dates
  const validate = (): boolean => {
    if (!modifyDates) return true;

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

    // Check sufficient credits if extending
    if (adjustmentInfo.newBalance < 0) {
      errors.endDate = UI.INSUFFICIENT_CREDITS_WARNING.replace(
        "{amount}",
        Math.abs(adjustmentInfo.newBalance).toString()
      );
    }

    setValidationErrors(errors);
    return Object.keys(errors).every((k) => errors[k as keyof typeof errors] === null);
  };

  const handleConfirm = async () => {
    if (!validate()) return;

    try {
      setApiError(null);
      const command: UpdateReservationCommand = {
        status: "RETURNED",
      };

      if (modifyDates && startDate && endDate) {
        command.startDate = startDate;
        command.endDate = endDate;
      }

      await onConfirm(command);
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to mark reservation as returned";
      setApiError(errorMessage);
    }
  };

  // Handle errors clearing
  React.useEffect(() => {
    if (modifyDates && startDate && endDate) {
      setValidationErrors({ startDate: null, endDate: null });
      setApiError(null);
    }
  }, [startDate, endDate, modifyDates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{UI.RETURN_WITH_DATES_TITLE}</DialogTitle>
          <DialogDescription>
            {UI.RETURN_WITH_DATES_DESCRIPTION}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Modify Dates Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="modify-dates"
              checked={modifyDates}
              onCheckedChange={(checked) => setModifyDates(!!checked)}
              disabled={isSubmitting}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="modify-dates"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {UI.MODIFY_DATES_BEFORE_RETURN}
              </Label>
              <p className="text-sm text-muted-foreground">
                {UI.MODIFY_DATES_CHECKBOX_HINT}
              </p>
            </div>
          </div>

          {/* Date Picker Section */}
          {modifyDates && (
            <div className="space-y-6 pt-2 border-t">
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

                  <SignificantExtensionWarning
                    creditAdjustment={adjustmentInfo.adjustment}
                  />
                </>
              )}
            </div>
          )}

          {/* Final Status Warning */}
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              {UI.FINAL_STATUS_WARNING}
            </AlertDescription>
          </Alert>

           {/* API Error */}
           {apiError && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertDescription className="text-destructive">
                {apiError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {UI.CANCEL_CHANGES}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isSubmitting ||
              (modifyDates && adjustmentInfo.newBalance < 0)
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {UI.UPDATING_RESERVATION}
              </>
            ) : (
              UI.CONFIRM_RETURN
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
