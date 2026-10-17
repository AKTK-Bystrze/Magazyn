import * as React from "react";
import type { CartItem, CostBreakdown } from "@/types/reservation-cart.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils/date-utils";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  items: CartItem[];
  startDate: string;
  endDate: string;
  costBreakdown: CostBreakdown;
  isSubmitting: boolean;
}

/**
 * Confirmation modal for reservation creation.
 * Displays summary and handles final submission using standard Shadcn Dialog.
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  startDate,
  endDate,
  costBreakdown,
  isSubmitting,
}: ConfirmationModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="reservation-confirmation-modal"
        showCloseButton={!isSubmitting}
      >
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-bold">Potwierdź Rezerwację</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Szczegóły Rezerwacji</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="w-full flex justify-between items-center">
                <span className="text-muted-foreground">Data Rozpoczęcia:</span>
                <span className="font-medium text-right">{formatDate(startDate)}</span>
              </div>
              <div className="w-full flex justify-between items-center">
                <span className="text-muted-foreground">Data Zakończenia:</span>
                <span className="font-medium text-right">{formatDate(endDate)}</span>
              </div>
              <div className="w-full flex justify-between items-center">
                <span className="text-muted-foreground">Czas trwania:</span>
                <span className="font-medium text-right">
                  {costBreakdown.itemCosts[0]?.days || 0}{" "}
                  {(costBreakdown.itemCosts[0]?.days || 0) === 1 ? "dzień" : "dni"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              Sprzęt ({items.length} {items.length === 1 ? "przedmiot" : "przedmiotów"})
            </h3>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.equipmentId}
                  className="w-full flex justify-between items-center text-sm py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">{item.typeName}</p>
                  </div>
                  <span className="text-muted-foreground text-right">
                    {item.creditCostPerDay} godzinki/dzień
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Podsumowanie Kosztu</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="space-y-2">
                {costBreakdown.isFreeReservation && (
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      Darmowa Rezerwacja
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ta rezerwacja nie będzie obciążała konta godzinkami
                    </p>
                  </div>
                )}
                {costBreakdown.itemCosts.map((item) => (
                  <div
                    key={item.equipmentId}
                    className={`w-full flex justify-between items-center text-sm ${
                      costBreakdown.isFreeReservation ? "border-b last:border-0 pb-2 last:pb-0" : ""
                    }`}
                  >
                    <span className="text-foreground">
                      {item.name}{" "}
                      <span className="text-muted-foreground">
                        ({item.creditCostPerDay} × {item.days})
                      </span>
                    </span>
                    <span
                      className={
                        costBreakdown.isFreeReservation
                          ? "text-green-600 dark:text-green-400 font-medium text-right"
                          : "text-right"
                      }
                    >
                      {costBreakdown.isFreeReservation
                        ? "0 godzinek"
                        : `${item.totalCost} godzinki`}
                    </span>
                  </div>
                ))}
                {!costBreakdown.isFreeReservation && (
                  <div className="border-t pt-2 mt-2 w-full flex justify-between items-center font-semibold">
                    <span>Całkowity Koszt:</span>
                    <span className="text-destructive text-right">
                      -{costBreakdown.totalCreditCost} godzinki
                    </span>
                  </div>
                )}
                <div
                  className={`w-full flex justify-between items-center text-sm ${
                    costBreakdown.isFreeReservation ? "border-t pt-2 mt-2" : ""
                  }`}
                >
                  <span className="text-muted-foreground">Aktualne Saldo:</span>
                  <span data-testid="confirmation-current-balance" className="text-right">
                    {costBreakdown.currentBalance} godzinki
                  </span>
                </div>
                <div className="w-full flex justify-between items-center font-semibold text-lg border-t pt-2">
                  <span>Pozostałe Saldo:</span>
                  <span
                    className="text-primary text-right"
                    data-testid="confirmation-remaining-balance"
                  >
                    {costBreakdown.isFreeReservation
                      ? costBreakdown.currentBalance
                      : costBreakdown.remainingBalance}{" "}
                    godzinki
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
              data-testid="cancel-confirmation-button"
            >
              Anuluj
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1"
              data-testid="confirm-reservation-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tworzenie...
                </>
              ) : (
                "Potwierdź Rezerwację"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
