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
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  ICON_SIZE_SM,
  RESERVATION_STATUS_VIEW_UI_STRINGS as UI,
  RESERVATION_STATUS_LABELS,
} from "@/lib/config/constants";
import type { ReservationDetail } from "@/types";
import type { Enums } from "@/db/database.types";

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationDetail;
  targetStatus: Enums<"reservation_status"> | null;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  mode: "cancel" | "mark_returned" | "admin_change";
}

/**
 * Confirmation dialog for reservation status changes
 * Shows different content based on the type of change (cancel, return, admin change)
 *
 * @param open - Whether dialog is open
 * @param onOpenChange - Callback when dialog open state changes
 * @param reservation - Reservation being modified
 * @param targetStatus - New status to apply
 * @param onConfirm - Callback when user confirms
 * @param isSubmitting - Loading state during submission
 * @param mode - Type of status change
 */
export function StatusChangeDialog({
  open,
  onOpenChange,
  reservation,
  targetStatus,
  onConfirm,
  isSubmitting,
  mode,
}: StatusChangeDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  // Get dialog content based on mode
  const getDialogContent = () => {
    switch (mode) {
      case "cancel":
        return {
          title: UI.CONFIRM_CANCEL_TITLE,
          message: UI.CONFIRM_CANCEL_MESSAGE,
          confirmButton: UI.CONFIRM_CANCEL_BUTTON,
          cancelButton: UI.KEEP_RESERVATION,
          variant: "destructive" as const,
          showRefund: true,
        };
      case "mark_returned":
        return {
          title: UI.CONFIRM_MARK_RETURNED_TITLE,
          message: UI.CONFIRM_MARK_RETURNED_MESSAGE,
          confirmButton: UI.CONFIRM_MARK_RETURNED_BUTTON,
          cancelButton: UI.CANCEL_CHANGE,
          variant: "default" as const,
          showRefund: false,
        };
      case "admin_change":
        return {
          title: UI.CONFIRM_STATUS_CHANGE_TITLE,
          message: `${UI.CONFIRM_STATUS_CHANGE_MESSAGE} ${
            RESERVATION_STATUS_LABELS[reservation.status]
          } to ${RESERVATION_STATUS_LABELS[targetStatus || ""]}`,
          confirmButton: UI.CONFIRM_STATUS_CHANGE_BUTTON,
          cancelButton: UI.CANCEL_CHANGE,
          variant: "default" as const,
          showRefund: targetStatus === "DENIED",
        };
      default:
        return null;
    }
  };

  const content = getDialogContent();
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.message}</DialogDescription>
        </DialogHeader>

        {/* Warning for cancel/denied */}
        {(mode === "cancel" || (mode === "admin_change" && targetStatus === "DENIED")) && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className={ICON_SIZE_SM + " text-amber-600"} />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              This action cannot be undone. The equipment will become available
              for others to reserve.
            </AlertDescription>
          </Alert>
        )}

        {/* Refund information */}
        {content.showRefund && (
          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {UI.CONFIRM_REFUND_LABEL}
              </span>
              <span className="text-lg font-semibold text-green-600">
                +{reservation.creditCost} credits
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {content.cancelButton}
          </Button>
          <Button
            variant={content.variant}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {UI.UPDATING}
              </>
            ) : (
              content.confirmButton
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
