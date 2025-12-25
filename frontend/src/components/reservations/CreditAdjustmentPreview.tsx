import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Calendar, Coins } from "lucide-react";
import { formatCreditAdjustment } from "@/lib/utils/credit-utils";
import { formatDate } from "@/lib/utils/date-utils";
import { pluralize } from "@/lib/utils/text-utils";
import { ICON_SIZE_SM } from "@/lib/config/constants";

interface CreditAdjustmentPreviewProps {
  originalDates: { startDate: string; endDate: string };
  newDates: { startDate: string; endDate: string };
  originalCreditCost: number;
  newCreditCost: number;
  currentBalance: number;
}

/**
 * Displays a comparison of old vs new dates and resulting credit adjustment
 * Shows:
 * - Date range comparison (old → new)
 * - Duration change in days
 * - Credit adjustment (refund or charge)
 * - New balance after adjustment
 *
 * @param originalDates - Original start and end dates
 * @param newDates - New start and end dates
 * @param originalCreditCost - Original credit cost
 * @param newCreditCost - New credit cost
 * @param currentBalance - User's current credit balance
 */
export function CreditAdjustmentPreview({
  originalDates,
  newDates,
  originalCreditCost,
  newCreditCost,
  currentBalance,
}: CreditAdjustmentPreviewProps) {
  const originalDays =
    Math.ceil(
      (new Date(originalDates.endDate).getTime() - new Date(originalDates.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  const newDays =
    Math.ceil(
      (new Date(newDates.endDate).getTime() - new Date(newDates.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  const adjustment = originalCreditCost - newCreditCost;
  const newBalance = currentBalance + adjustment;

  // Determine styling based on adjustment type
  const adjustmentColor =
    adjustment > 0
      ? "text-green-600 dark:text-green-400"
      : adjustment < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  const balanceColor = newBalance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground";

  return (
    <div className="space-y-4">
      {/* Date Comparison */}
      <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className={ICON_SIZE_SM} />
          <span>Date Comparison</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* Original Dates */}
          <div className="text-sm">
            <div className="text-muted-foreground mb-1">Original</div>
            <div className="font-medium">
              {formatDate(originalDates.startDate)} - {formatDate(originalDates.endDate)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {originalDays} {pluralize(originalDays, "day")}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* New Dates */}
          <div className="text-sm">
            <div className="text-muted-foreground mb-1">New</div>
            <div className="font-medium">
              {formatDate(newDates.startDate)} - {formatDate(newDates.endDate)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {newDays} {pluralize(newDays, "day")}
            </div>
          </div>
        </div>
      </div>

      {/* Credit Adjustment */}
      <Alert className={adjustment !== 0 ? "border-2" : ""} data-testid="credit-adjustment">
        <Coins className={ICON_SIZE_SM} />
        <AlertDescription>
          <div className="space-y-2">
            {/* Adjustment Amount */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Credit Adjustment:</span>
              <span className={`text-sm font-bold ${adjustmentColor}`}>
                {formatCreditAdjustment(adjustment)}
              </span>
            </div>

            {/* Current Balance */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Current Balance:</span>
              <span>{currentBalance} credits</span>
            </div>

            {/* New Balance */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">New Balance:</span>
              <span className={`text-sm font-bold ${balanceColor}`}>{newBalance} credits</span>
            </div>

            {/* Insufficient Credits Warning */}
            {newBalance < 0 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-start gap-1">
                <span>⚠️</span>
                <span>
                  Insufficient credits. You need {Math.abs(newBalance)} more credits to complete
                  this modification.
                </span>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
