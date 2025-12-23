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
            Podsumowanie Kosztu
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Wybierz daty, aby zobaczyć koszt
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasInsufficientCredits = costBreakdown.remainingBalance < 0;

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
          <h4 className="text-sm font-medium text-muted-foreground">
            Podział według Sprzętu
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
                    {item.days === 1 ? "dzień" : "dni"})
                  </span>
                </span>
                <span className="font-medium">{item.totalCost} godzinki</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Aktualne Saldo</span>
            <span className="font-medium" data-testid="current-credit-balance">
              {costBreakdown.currentBalance} godzinki
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Całkowity Koszt</span>
            <span className="font-medium" data-testid="reservation-total-cost">
              -{costBreakdown.totalCreditCost} godzinki
            </span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Pozostałe Saldo</span>
            <span
              className={
                hasInsufficientCredits ? "text-destructive" : "text-primary"
              }
              data-testid="remaining-credit-balance"
            >
              {costBreakdown.remainingBalance} godzinki
            </span>
          </div>
        </div>

        {hasInsufficientCredits && (
          <Alert className="border-destructive bg-destructive/10" data-testid="error-insufficient-credits">
            <AlertCircle className={ICON_SIZE_SM} />
            <div className="ml-2">
              <p className="font-semibold">Niewystarczająca liczba godzinek</p>
              <p className="text-sm mt-1">
                Potrzebujesz {Math.abs(costBreakdown.remainingBalance)} więcej godzinek,
                aby dokończyć tę rezerwację.
              </p>
              <a
                href={ROUTES.PROTECTED.CREDIT_REQUESTS}
                className="text-sm underline hover:no-underline mt-2 inline-block"
              >
                Proś o więcej godzinek
              </a>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
