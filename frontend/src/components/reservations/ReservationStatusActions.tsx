import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { ModifyDatesDialog } from "./ModifyDatesDialog";
import { ReturnWithDatesDialog } from "./ReturnWithDatesDialog";
import { ChevronDown, X, CheckCircle, CalendarClock } from "lucide-react";
import { canChangeStatus } from "@/lib/utils/status-utils";
import {
  ICON_SIZE_SM,
  RESERVATION_STATUS_VIEW_UI_STRINGS as UI,
  RESERVATION_DATE_MODIFICATION_UI_STRINGS as DATE_UI,
  RESERVATION_STATUS_LABELS,
} from "@/lib/config/constants";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users-api";
import { reservationsApi } from "@/lib/api/reservations-api";
import type { ReservationDetail } from "@/types";
import type { Enums } from "@/db/database.types";
import type { UpdateReservationCommand } from "@/types/reservations/reservation.types";

interface ReservationStatusActionsProps {
  reservation: ReservationDetail;
  currentUserId: string;
  currentUserBalance: number; // User's credit balance from session
  isAdmin: boolean;
  onStatusChange: (newStatus: Enums<"reservation_status">) => Promise<void>;
  isUpdating: boolean;
}

/**
 * Renders available status change actions based on user role and current status
 * Shows button actions for users and dropdown for admins
 * Integrated with dialogs for modifying dates and returning equipment
 */
export function ReservationStatusActions({
  reservation,
  currentUserId,
  currentUserBalance,
  isAdmin,
  onStatusChange,
  isUpdating,
}: ReservationStatusActionsProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [modifyDatesOpen, setModifyDatesOpen] = React.useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = React.useState(false);
  const [adminStatusDialogOpen, setAdminStatusDialogOpen] = React.useState(false);
  const [targetStatus, setTargetStatus] = React.useState<Enums<"reservation_status"> | null>(null);

  const isOwner = reservation.userId === currentUserId;
  const actions = canChangeStatus(reservation.status, isOwner, isAdmin);

  // Fetch reservation owner's profile to get current credit balance
  // Only needed when admin is modifying another user's reservation
  const needsOwnerProfile = !isOwner && (modifyDatesOpen || returnDialogOpen);

  const { data: ownerProfile } = useQuery({
    queryKey: ["user", reservation.userId],
    queryFn: () => usersApi.getById(reservation.userId),
    enabled: needsOwnerProfile,
    staleTime: 0, // Always fetch fresh balance when dialog opens
  });

  // Use current user's balance if they're the owner, otherwise use fetched owner's balance
  const userBalance = isOwner ? currentUserBalance : (ownerProfile?.creditBalance ?? 0);

  // Handlers
  const handleCancelClick = () => {
    setTargetStatus("DENIED");
    setCancelDialogOpen(true);
  };

  const handleModifyDatesClick = () => {
    setModifyDatesOpen(true);
  };

  const handleMarkReturnedClick = () => {
    setReturnDialogOpen(true);
  };

  const handleAdminStatusClick = (newStatus: Enums<"reservation_status">) => {
    setTargetStatus(newStatus);
    setAdminStatusDialogOpen(true);
  };

  // Confirmations
  const handleCancelConfirm = async () => {
    await onStatusChange("DENIED");
    setCancelDialogOpen(false);
  };

  const handleAdminStatusConfirm = async () => {
    if (targetStatus) {
      await onStatusChange(targetStatus);
      setAdminStatusDialogOpen(false);
    }
  };

  const handleModifyDatesConfirm = async (newDates: {
    startDate: string;
    endDate: string;
  }) => {
    const command: UpdateReservationCommand = {
      startDate: newDates.startDate,
      endDate: newDates.endDate,
    };
    await reservationsApi.update(reservation.id, command);
    // Reload page or invalidate queries handled by parent/hook
    window.location.reload(); // Simple refresh to show updated data
  };

  const handleReturnConfirm = async (command: UpdateReservationCommand) => {
    await reservationsApi.update(reservation.id, command);
    window.location.reload();
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
      {/* Modify Dates Button (Pending only) */}
      {reservation.status === "PENDING" && (isOwner || isAdmin) && (
        <Button
          variant="outline"
          onClick={handleModifyDatesClick}
          disabled={isUpdating}
        >
          <CalendarClock className={ICON_SIZE_SM + " mr-2"} />
          {DATE_UI.MODIFY_DATES_BUTTON}
        </Button>
      )}

      {/* Cancel Button */}
      {actions.canCancel && (
        <Button
          variant="outline"
          onClick={handleCancelClick}
          disabled={isUpdating}
          className="text-destructive hover:text-destructive"
        >
          <X className={ICON_SIZE_SM + " mr-2"} />
          {UI.CANCEL_RESERVATION}
        </Button>
      )}

      {/* Mark Returned Button */}
      {actions.canMarkReturned && (
        <Button
          variant="outline"
          onClick={handleMarkReturnedClick}
          disabled={isUpdating}
        >
          <CheckCircle className={ICON_SIZE_SM + " mr-2"} />
          {UI.MARK_RETURNED}
        </Button>
      )}

      {/* Admin Status Dropdown */}
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
                onClick={() => handleAdminStatusClick(status)}
                variant={status === "DENIED" ? "destructive" : "default"}
              >
                {RESERVATION_STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Dialogs */}
      <StatusChangeDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        reservation={reservation}
        targetStatus="DENIED"
        onConfirm={handleCancelConfirm}
        isSubmitting={isUpdating}
        mode="cancel"
      />

      <StatusChangeDialog
        open={adminStatusDialogOpen}
        onOpenChange={setAdminStatusDialogOpen}
        reservation={reservation}
        targetStatus={targetStatus}
        onConfirm={handleAdminStatusConfirm}
        isSubmitting={isUpdating}
        mode="admin_change"
      />

      <ModifyDatesDialog
        open={modifyDatesOpen}
        onOpenChange={setModifyDatesOpen}
        reservation={reservation}
        onConfirm={handleModifyDatesConfirm}
        isSubmitting={isUpdating}
        currentUserBalance={userBalance}
      />

      <ReturnWithDatesDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        reservation={reservation}
        onConfirm={handleReturnConfirm}
        isSubmitting={isUpdating}
        currentUserBalance={userBalance}
      />
    </div>
  );
}
