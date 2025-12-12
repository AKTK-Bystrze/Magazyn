import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils/date-utils";
import {
  ICON_SIZE_SM,
  Z_INDEX_MODAL_BACKDROP,
  Z_INDEX_MODAL_CONTENT,
  MODAL_BACKDROP_OPACITY,
  MODAL_MAX_HEIGHT,
} from "@/lib/config/constants";
import type { ReservationListItem } from "@/types";

interface CancelReservationDialogProps {
  isOpen: boolean;
  reservation: ReservationListItem | null;
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * Confirmation dialog for cancelling a reservation
 * Shows reservation details and refund information
 *
 * @param isOpen - Whether the dialog is open
 * @param reservation - Reservation to cancel
 * @param isSubmitting - Loading state for cancel action
 * @param onConfirm - Callback when user confirms cancellation
 * @param onClose - Callback when dialog closes
 */
export function CancelReservationDialog({
  isOpen,
  reservation,
  isSubmitting,
  onConfirm,
  onClose,
}: CancelReservationDialogProps) {
  // Handle escape key
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

  if (!isOpen || !reservation) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX_MODAL_BACKDROP }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${parseInt(MODAL_BACKDROP_OPACITY) / 100})`,
        }}
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <Card
        className="relative w-full max-w-md m-4"
        style={{
          zIndex: Z_INDEX_MODAL_CONTENT,
          maxHeight: MODAL_MAX_HEIGHT,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
      >
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <h2 id="cancel-dialog-title" className="text-xl font-bold">
              Cancel Reservation
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close dialog"
            >
              <X className={ICON_SIZE_SM} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Warning */}
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className={ICON_SIZE_SM + " text-amber-600"} />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              This action cannot be undone. The equipment will become available
              for others to reserve.
            </AlertDescription>
          </Alert>

          {/* Reservation Details */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">
              Reservation Details
            </h3>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipment:</span>
                <span className="font-medium">{reservation.equipmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dates:</span>
                <span>
                  {formatDate(reservation.startDate)} —{" "}
                  {formatDate(reservation.endDate)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground">Refund Amount:</span>
                <span className="font-semibold text-green-600">
                  +{reservation.creditCost} credits
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Keep Reservation
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Reservation"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
