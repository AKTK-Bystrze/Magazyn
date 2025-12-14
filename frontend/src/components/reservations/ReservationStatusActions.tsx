import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { ChevronDown, X, CheckCircle } from "lucide-react";
import { canChangeStatus } from "@/lib/utils/status-utils";
import {
  ICON_SIZE_SM,
  RESERVATION_STATUS_VIEW_UI_STRINGS as UI,
  RESERVATION_STATUS_LABELS,
} from "@/lib/config/constants";
import type { ReservationDetail } from "@/types";
import type { Enums } from "@/db/database.types";

interface ReservationStatusActionsProps {
  reservation: ReservationDetail;
  currentUserId: string;
  isAdmin: boolean;
  onStatusChange: (newStatus: Enums<"reservation_status">) => Promise<void>;
  isUpdating: boolean;
}

/**
 * Renders available status change actions based on user role and current status
 * Shows button actions for users and dropdown for admins
 *
 * @param reservation - Current reservation
 * @param currentUserId - ID of logged-in user
 * @param isAdmin - Whether user is admin
 * @param onStatusChange - Callback when status change confirmed
 * @param isUpdating - Loading state during mutation
 */
export function ReservationStatusActions({
  reservation,
  currentUserId,
  isAdmin,
  onStatusChange,
  isUpdating,
}: ReservationStatusActionsProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<
    "cancel" | "mark_returned" | "admin_change"
  >("cancel");
  const [targetStatus, setTargetStatus] =
    React.useState<Enums<"reservation_status"> | null>(null);

  const isOwner = reservation.userId === currentUserId;
  const actions = canChangeStatus(reservation.status, isOwner, isAdmin);

  // Handle cancel action
  const handleCancel = () => {
    setDialogMode("cancel");
    setTargetStatus("DENIED");
    setDialogOpen(true);
  };

  // Handle mark returned action
  const handleMarkReturned = () => {
    setDialogMode("mark_returned");
    setTargetStatus("RETURNED");
    setDialogOpen(true);
  };

  // Handle admin status change
  const handleAdminChange = (newStatus: Enums<"reservation_status">) => {
    setDialogMode("admin_change");
    setTargetStatus(newStatus);
    setDialogOpen(true);
  };

  // Confirm dialog action
  const handleConfirm = async () => {
    if (targetStatus) {
      await onStatusChange(targetStatus);
    }
  };

  // No actions available
  if (
    !actions.canCancel &&
    !actions.canMarkReturned &&
    !actions.canChangeStatus
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {/* Cancel button (user/admin) */}
      {actions.canCancel && (
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isUpdating}
          className="text-destructive hover:text-destructive"
        >
          <X className={ICON_SIZE_SM + " mr-2"} />
          {UI.CANCEL_RESERVATION}
        </Button>
      )}

      {/* Mark Returned button (user/admin) */}
      {actions.canMarkReturned && (
        <Button
          variant="outline"
          onClick={handleMarkReturned}
          disabled={isUpdating}
        >
          <CheckCircle className={ICON_SIZE_SM + " mr-2"} />
          {UI.MARK_RETURNED}
        </Button>
      )}

      {/* Admin status dropdown */}
      {actions.canChangeStatus && actions.availableStatuses.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" disabled={isUpdating}>
              {UI.CHANGE_STATUS}
              <ChevronDown className={ICON_SIZE_SM + " ml-2"} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.availableStatuses.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleAdminChange(status)}
                variant={status === "DENIED" ? "destructive" : "default"}
              >
                {RESERVATION_STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Confirmation dialog */}
      <StatusChangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reservation={reservation}
        targetStatus={targetStatus}
        onConfirm={handleConfirm}
        isSubmitting={isUpdating}
        mode={dialogMode}
      />
    </div>
  );
}
