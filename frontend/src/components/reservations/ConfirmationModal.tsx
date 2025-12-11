import * as React from "react";
import type { CartItem, CostBreakdown } from "@/types/reservation-cart.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { X, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils/date-utils";
import {
  ICON_SIZE_SM,
  Z_INDEX_MODAL_BACKDROP,
  Z_INDEX_MODAL_CONTENT,
  MODAL_BACKDROP_OPACITY,
  MODAL_MAX_HEIGHT,
} from "@/lib/config/constants";

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
 * Confirmation modal for reservation creation
 * Displays summary and handles final submission
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
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX_MODAL_BACKDROP }}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0, 0, 0, ${parseInt(MODAL_BACKDROP_OPACITY) / 100})` }}
        onClick={isSubmitting ? undefined : onClose}
      />

      <Card
        className="relative w-full max-w-2xl overflow-y-auto m-4"
        style={{
          zIndex: Z_INDEX_MODAL_CONTENT,
          maxHeight: MODAL_MAX_HEIGHT,
        }}
      >
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Confirm Reservation</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close modal"
            >
              <X className={ICON_SIZE_SM} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Reservation Details</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date:</span>
                <span className="font-medium">{formatDate(startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Date:</span>
                <span className="font-medium">{formatDate(endDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">
                  {costBreakdown.itemCosts[0]?.days || 0} days
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              Equipment ({items.length} items)
            </h3>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.equipmentId}
                  className="flex justify-between text-sm py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.typeName}
                    </p>
                  </div>
                  <span className="text-muted-foreground">
                    {item.creditCostPerDay} credits/day
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Cost Summary</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              {costBreakdown.itemCosts.map((item) => (
                <div
                  key={item.equipmentId}
                  className="flex justify-between text-sm"
                >
                  <span className="text-foreground">
                    {item.name}{" "}
                    <span className="text-muted-foreground">
                      ({item.creditCostPerDay} × {item.days})
                    </span>
                  </span>
                  <span>{item.totalCost} credits</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                <span>Total Cost:</span>
                <span className="text-destructive">
                  -{costBreakdown.totalCreditCost} credits
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance:</span>
                <span>{costBreakdown.currentBalance} credits</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Remaining Balance:</span>
                <span className="text-primary">
                  {costBreakdown.remainingBalance} credits
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Confirm Reservation"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
