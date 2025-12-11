import * as React from "react";
import type { CostBreakdown, CartItem } from "@/types/reservation-cart.types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AlertCircle, CreditCard } from "lucide-react";
import { calculateCost } from "@/lib/utils/cart-validation";
import { ROUTES } from "@/lib/config/routes";
import { ICON_SIZE_SM, ICON_SIZE_MD } from "@/lib/config/constants";
import { pluralize } from "@/lib/utils/text-utils";

interface CostEstimatorProps {
  items: CartItem[];
  startDate: string | null;
  endDate: string | null;
  currentCreditBalance: number;
}

/**
 * Displays real-time cost calculation for the reservation
 * Shows item breakdown, total cost, and balance
 */
export function CostEstimator({
  items,
  startDate,
  endDate,
  currentCreditBalance,
}: CostEstimatorProps) {
  const costBreakdown = React.useMemo<CostBreakdown | null>(() => {
    if (!startDate || !endDate || items.length === 0) {
      return null;
    }
    return calculateCost(items, startDate, endDate, currentCreditBalance);
  }, [items, startDate, endDate, currentCreditBalance]);

  if (!costBreakdown) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className={ICON_SIZE_MD} />
            Cost Summary
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select dates to see cost estimate
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasInsufficientCredits = costBreakdown.remainingBalance < 0;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className={ICON_SIZE_MD} />
          Cost Summary
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Item Breakdown
          </h4>
          <div className="space-y-1">
            {costBreakdown.itemCosts.map((item) => (
              <div
                key={item.equipmentId}
                className="flex justify-between text-sm"
              >
                <span className="text-foreground">
                  {item.name}{" "}
                  <span className="text-muted-foreground">
                    ({item.creditCostPerDay} × {item.days}{" "}
                    {pluralize(item.days, "day")})
                  </span>
                </span>
                <span className="font-medium">{item.totalCost} credits</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Balance</span>
            <span className="font-medium">
              {costBreakdown.currentBalance} credits
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Cost</span>
            <span className="font-medium">
              -{costBreakdown.totalCreditCost} credits
            </span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Remaining Balance</span>
            <span
              className={
                hasInsufficientCredits ? "text-destructive" : "text-primary"
              }
            >
              {costBreakdown.remainingBalance} credits
            </span>
          </div>
        </div>

        {hasInsufficientCredits && (
          <Alert variant="destructive">
            <AlertCircle className={ICON_SIZE_SM} />
            <div className="ml-2">
              <p className="font-semibold">Insufficient Credits</p>
              <p className="text-sm mt-1">
                You need {Math.abs(costBreakdown.remainingBalance)} more credits
                to complete this reservation.
              </p>
              <a
                href={ROUTES.PROTECTED.CREDIT_REQUESTS}
                className="text-sm underline hover:no-underline mt-2 inline-block"
              >
                Request more credits
              </a>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
