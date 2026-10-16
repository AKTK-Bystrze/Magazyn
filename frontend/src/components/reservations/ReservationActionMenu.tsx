import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, X, CornerDownLeft, Eye, Edit2 } from "lucide-react";
import { ICON_SIZE_SM, RESERVATION_STATUS } from "@/lib/config/constants";
import type { ReservationListItem } from "@/types";

/**
 * Props for the ReservationActionMenu component.
 */
export interface ReservationActionMenuProps {
  /** The reservation item to perform actions on */
  item: ReservationListItem;
  /** Current view mode */
  mode: "user" | "admin";
  /** Current scope */
  scope: "my" | "all";
  /** Callback to view reservation details */
  onViewDetails: (item: ReservationListItem) => void;
  /** Optional callback to modify reservation dates */
  onModify?: (item: ReservationListItem) => void;
  /** Optional callback to cancel reservation */
  onCancel?: (item: ReservationListItem) => void;
  /** Optional callback to return reservation */
  onReturn?: (item: ReservationListItem) => void;
}

/**
 * Dropdown action menu for a reservation item.
 * Encapsulates permissions (canModify, canReturn, showActions) and action triggers.
 */
export function ReservationActionMenu({
  item,
  mode,
  scope,
  onViewDetails,
  onModify,
  onCancel,
  onReturn,
}: ReservationActionMenuProps) {
  const canModify = item.status === RESERVATION_STATUS.PENDING;
  const canReturn =
    item.status === RESERVATION_STATUS.PENDING || item.status === RESERVATION_STATUS.RENTED;
  const showActions = mode === "admin" || scope === "my";

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(item);
  };

  const handleModify = (e: React.MouseEvent) => {
    e.stopPropagation();
    onModify?.(item);
  };

  const handleReturn = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReturn?.(item);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.(item);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()}
          className="h-8 w-8"
          data-testid="reservation-action-menu-trigger"
        >
          <MoreHorizontal className={ICON_SIZE_SM} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleViewDetails}>
          <Eye className={ICON_SIZE_SM + " mr-2"} />
          Szczegóły
        </DropdownMenuItem>

        {showActions && (canModify || canReturn) && (
          <>
            <DropdownMenuSeparator />
            {canModify && onModify && (
              <DropdownMenuItem onClick={handleModify}>
                <Edit2 className={ICON_SIZE_SM + " mr-2"} />
                Zmień daty
              </DropdownMenuItem>
            )}
            {canReturn && onReturn && (
              <DropdownMenuItem
                onClick={handleReturn}
                className="text-blue-600 focus:text-blue-600 dark:text-blue-400 dark:focus:text-blue-400"
                data-testid="return-reservation-button"
              >
                <CornerDownLeft className={ICON_SIZE_SM + " mr-2"} />
                Zwróć
              </DropdownMenuItem>
            )}
            {canModify && onCancel && (
              <DropdownMenuItem
                onClick={handleCancel}
                className="text-destructive focus:text-destructive"
                data-testid="cancel-reservation-button"
              >
                <X className={ICON_SIZE_SM + " mr-2"} />
                Anuluj
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
