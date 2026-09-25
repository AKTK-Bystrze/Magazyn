import * as React from "react";
import type { CostBreakdown, CartItem } from "@/types/reservation-cart.types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AlertCircle, CreditCard } from "lucide-react";
import { calculateCost } from "@/lib/utils/cart-validation";
import { ROUTES } from "@/lib/config/routes";
import { ICON_SIZE_SM, ICON_SIZE_MD } from "@/lib/config/constants";

interface CostEstimatorProps {
  items: CartItem[];
  startDate: string | null;
  endDate: string | null;
  currentCreditBalance: number;
  isFreeReservation?: boolean;
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
  isFreeReservation = false,
}: CostEstimatorProps) {
  const costBreakdown = React.useMemo<CostBreakdown | null>(() => {
    if (!startDate || !endDate || items.length === 0) {
      return null;
    }
    const breakdown = calculateCost(items, startDate, endDate, currentCreditBalance);

    if (isFreeReservation && breakdown) {
      return {
        ...breakdown,
        itemCosts: breakdown.itemCosts.map((item) => ({ ...item, totalCost: 0 })),
        totalCreditCost: 0,
        remainingBalance: breakdown.currentBalance, // No deduction for free
        isFreeReservation: true,
      };
    }

    return breakdown;
  }, [items, startDate, endDate, currentCreditBalance, isFreeReservation]);

  if (!costBreakdown) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className={ICON_SIZE_MD} />
            Podsumowanie Kosztu
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Wybierz daty, aby zobaczyć koszt</p>
        </CardContent>
      </Card>
    );
  }

  const hasInsufficientCredits =
    !costBreakdown.isFreeReservation && costBreakdown.remainingBalance < 0;

  return (
    <Card data-testid="cost-estimator">
      <CardHeader>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className={ICON_SIZE_MD} />
          Podsumowanie Kosztu
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Podział według Sprzętu</h4>
          <div className="space-y-1">
            {costBreakdown.itemCosts.map((item) => (
              <div
                key={item.equipmentId}
                className="w-full flex justify-between items-center text-sm"
              >
                <span className="text-foreground">
                  {item.name}{" "}
                  <span className="text-muted-foreground">
                    ({item.creditCostPerDay} × {item.days} {item.days === 1 ? "dzień" : "dni"})
                  </span>
                </span>
                <span
                  className={
                    costBreakdown.isFreeReservation
                      ? "font-medium text-green-600 dark:text-green-400 text-right"
                      : "font-medium text-right"
                  }
                >
                  {costBreakdown.isFreeReservation ? "0" : item.totalCost} godzinki
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2 w-full">
          {costBreakdown.isFreeReservation && (
            <div className="flex justify-center py-2 w-full">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Darmowa Rezerwacja
              </span>
            </div>
          )}
          <div className="w-full flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Aktualne Saldo</span>
            <span className="font-medium text-right" data-testid="current-credit-balance">
              {costBreakdown.currentBalance} godzinki
            </span>
          </div>
          <div className="w-full flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Całkowity Koszt</span>
            <span
              className={
                costBreakdown.isFreeReservation
                  ? "font-medium text-green-600 dark:text-green-400 text-right"
                  : "font-medium text-right"
              }
              data-testid="reservation-total-cost"
            >
              {costBreakdown.isFreeReservation ? "0" : `-${costBreakdown.totalCreditCost}`} godzinki
            </span>
          </div>
          <div className="border-t pt-2 w-full flex justify-between items-center font-semibold">
            <span>Pozostałe Saldo</span>
            <span
              className={`${hasInsufficientCredits ? "text-destructive" : "text-primary"} text-right`}
              data-testid="remaining-credit-balance"
            >
              {costBreakdown.isFreeReservation
                ? costBreakdown.currentBalance
                : costBreakdown.remainingBalance}{" "}
              godzinki
            </span>
          </div>
        </div>

        {hasInsufficientCredits && (
          <Alert
            className="border-destructive bg-destructive/10"
            data-testid="error-insufficient-credits"
          >
            <AlertCircle className={ICON_SIZE_SM} />
            <div className="ml-2">
              <p className="font-semibold">Niewystarczająca liczba godzinek</p>
              <p className="text-sm mt-1">
                Potrzebujesz {Math.abs(costBreakdown.remainingBalance)} więcej godzinek, aby
                dokończyć tę rezerwację.
              </p>
              <a
                href={ROUTES.PROTECTED.CREDITS_REQUEST}
                className="text-sm underline hover:no-underline mt-2 inline-block"
              >
                Poproś o więcej godzinek
              </a>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
