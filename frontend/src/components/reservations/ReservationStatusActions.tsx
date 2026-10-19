import * as React from "react";
import { Button } from "@/components/ui/button";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { ModifyDatesDialog } from "./ModifyDatesDialog";
import { ReturnWithDatesDialog } from "./ReturnWithDatesDialog";
import { X, CheckCircle, CalendarClock } from "lucide-react";
import { canChangeStatus } from "@/lib/utils/status-utils";
import {
  ICON_SIZE_SM,
  RESERVATION_STATUS_VIEW_UI_STRINGS as UI,
  RESERVATION_DATE_MODIFICATION_UI_STRINGS as DATE_UI,
} from "@/lib/config/constants";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users-api";
import { reservationsApi } from "@/lib/api/reservations-api";
import { equipmentApi } from "@/lib/api/equipment-api";
import type { ReservationDetail } from "@/types";
import type { Enums } from "@/db/database.types";
import type { UpdateReservationCommand } from "@/types/reservations/reservation.types";

interface ReservationStatusActionsProps {
  reservation: ReservationDetail;
  currentUserId: string;
  currentUserBalance: number;
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
  const isOwner = reservation.userId === currentUserId;
  const actions = canChangeStatus(reservation.status, isOwner, isAdmin);
  const canModify = actions.canCancel;

  const needsOwnerProfile = !isOwner && (modifyDatesOpen || returnDialogOpen);

  const { data: ownerProfile } = useQuery({
    queryKey: ["user", reservation.userId],
    queryFn: () => usersApi.getById(reservation.userId),
    enabled: needsOwnerProfile,
    // Always fetch fresh balance when dialog opens
    staleTime: 0,
  });

  const userBalance = isOwner ? currentUserBalance : (ownerProfile?.creditBalance ?? 0);

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };

  const handleModifyDatesClick = () => {
    setModifyDatesOpen(true);
  };

  const handleMarkReturnedClick = () => {
    setReturnDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    await onStatusChange("CANCELLED");
    setCancelDialogOpen(false);
  };

  const handleModifyDatesConfirm = async (newDates: { startDate: string; endDate: string }) => {
    const command: UpdateReservationCommand = {
      startDate: newDates.startDate,
      endDate: newDates.endDate,
    };
    await reservationsApi.update(reservation.id, command);
    window.location.reload();
  };

  const handleReturnConfirm = async (command: UpdateReservationCommand) => {
    if (command.notes?.trim()) {
      await equipmentApi.addMaintenanceLog(reservation.equipmentId, {
        notes: command.notes.trim(),
      });
    }
    await reservationsApi.update(reservation.id, command);
    window.location.reload();
  };

  if (!actions.canCancel && !actions.canMarkReturned) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {canModify && (
        <Button variant="outline" onClick={handleModifyDatesClick} disabled={isUpdating}>
          <CalendarClock className={ICON_SIZE_SM + " mr-2"} />
          {DATE_UI.MODIFY_DATES_BUTTON}
        </Button>
      )}

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

      {actions.canMarkReturned && (
        <Button variant="outline" onClick={handleMarkReturnedClick} disabled={isUpdating}>
          <CheckCircle className={ICON_SIZE_SM + " mr-2"} />
          {UI.MARK_RETURNED}
        </Button>
      )}

      <StatusChangeDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        reservation={reservation}
        targetStatus="CANCELLED"
        onConfirm={handleCancelConfirm}
        isSubmitting={isUpdating}
        mode="cancel"
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
