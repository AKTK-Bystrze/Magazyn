import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { pluralize } from "@/lib/utils/text-utils";
import { ICON_SIZE_SM } from "@/lib/config/constants";

interface DateChangeCreditInfoProps {
  creditAdjustment: number;
}

/**
 * Information alert displayed when reservation dates are changed
 * Always shows the credit impact of date modifications
 *
 * Displays:
 * - Whether credits will be charged or refunded
 * - The amount of credits involved
 *
 * @param creditAdjustment - Credit adjustment (positive = refund, negative = charge)
 */
export function SignificantExtensionWarning({ creditAdjustment }: DateChangeCreditInfoProps) {
  const isCharge = creditAdjustment < 0;
  const amount = Math.abs(creditAdjustment);

  // Don't show if no credit change
  if (creditAdjustment === 0) {
    return null;
  }

  return (
    <Alert
      className={
        isCharge
          ? "border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20"
          : "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20"
      }
      data-testid="extension-warning"
    >
      <Info
        className={`${ICON_SIZE_SM} ${
          isCharge ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
        }`}
      />
      <AlertDescription
        className={
          isCharge ? "text-amber-900 dark:text-amber-100" : "text-blue-900 dark:text-blue-100"
        }
      >
        <div className="space-y-1">
          <p className="font-semibold">
            {isCharge ? "Additional Credits Required" : "Credit Refund"}
          </p>
          <p className="text-sm">
            {isCharge
              ? `You will be charged ${amount} ${pluralize(amount, "credit")} for extending this reservation.`
              : `You will receive a refund of ${amount} ${pluralize(amount, "credit")} for shortening this reservation.`}
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
