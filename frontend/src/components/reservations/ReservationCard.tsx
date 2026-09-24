import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { Calendar, CreditCard, Edit2, User, X } from "lucide-react";
import { formatDate, calculateDays } from "@/lib/utils/date-utils";
import { ICON_SIZE_SM, RESERVATION_STATUS } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { canChangeStatus } from "@/lib/utils/status-utils";
import type { ReservationListItem } from "@/types";

interface ReservationCardProps {
  reservation: ReservationListItem;
  mode: "user" | "admin";
  isOwn?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Whether to show the 'Your reservation' badge */
  showOwnershipBadge?: boolean;
  onModify?: (reservation: ReservationListItem) => void;
  onCancel?: (reservation: ReservationListItem) => void;
  onReturn?: (reservation: ReservationListItem) => void;
  onViewDetails?: (reservation: ReservationListItem) => void;
}

/**
 * Displays a single reservation as a card
 * Shows equipment info, dates, status, and available actions
 */
export function ReservationCard({
  reservation,
  mode,
  isOwn = false,
  showActions = true,
  showOwnershipBadge = false,
  onModify,
  onCancel,
  onReturn,
  // onViewDetails - reserved for future use
}: ReservationCardProps) {
  const isAdmin = mode === "admin";
  // Determine available actions based on status and permissions
  const { canCancel, canMarkReturned } = React.useMemo(
    () => canChangeStatus(reservation.status, isOwn, isAdmin),
    [reservation.status, isOwn, isAdmin]
  );

  const isPending = reservation.status === RESERVATION_STATUS.PENDING;
  const days = calculateDays(reservation.startDate, reservation.endDate);

  const handleModify = React.useCallback(() => {
    onModify?.(reservation);
  }, [onModify, reservation]);

  const handleCancel = React.useCallback(() => {
    onCancel?.(reservation);
  }, [onCancel, reservation]);

  const handleReturn = React.useCallback(() => {
    onReturn?.(reservation);
  }, [onReturn, reservation]);

  return (
    <Card
      className={cn(
        "w-full max-w-full overflow-hidden hover:shadow-md transition-shadow",
        showOwnershipBadge && isOwn && "ring-2 ring-primary/30 bg-primary/5"
      )}
      data-testid={`reservation-row-${reservation.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-lg truncate min-w-0 flex-1">
                {reservation.equipmentName}
              </h3>
              {showOwnershipBadge && isOwn && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  Twoja rezerwacja
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{reservation.equipmentType}</p>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge
              status={reservation.status}
              data-testid={`reservation-status-${reservation.id}`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User (Admin view or All Reservations view) */}
        {(mode === "admin" || !isOwn) && (
          <div className="flex items-center gap-2 text-sm">
            <User className={ICON_SIZE_SM + " text-muted-foreground"} />
            <span className="font-medium text-foreground">{reservation.username}</span>
          </div>
        )}
        {/* Date Range */}
        <div className="flex items-start gap-2 text-sm min-w-0 w-full">
          <Calendar className={ICON_SIZE_SM + " text-muted-foreground flex-shrink-0 mt-0.5"} />
          <div className="flex-1 min-w-0 break-words">
            <span>
              {formatDate(reservation.startDate)} — {formatDate(reservation.endDate)}
            </span>
            <span className="text-muted-foreground ml-1 inline-block">
              ({days} {days === 1 ? "dzień" : "dni"})
            </span>
          </div>
        </div>

        {/* Cost */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className={ICON_SIZE_SM + " text-muted-foreground flex-shrink-0"} />
          <span className="font-medium">{reservation.creditCost} godzinki</span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2">
            {/* Modify - Only for Pending */}
            {isPending && onModify && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleModify}
                className="flex items-center gap-1"
                data-testid="modify-dates-button"
              >
                <Edit2 className={ICON_SIZE_SM} />
                Modyfikuj
              </Button>
            )}

            {/* Cancel - If allowed by status utils */}
            {canCancel && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex items-center gap-1 text-destructive hover:text-destructive"
                data-testid="cancel-reservation-button"
              >
                <X className={ICON_SIZE_SM} />
                Anuluj
              </Button>
            )}

            {/* Return - If allowed by status utils */}
            {canMarkReturned && onReturn && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReturn}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/20"
              >
                <Calendar className={ICON_SIZE_SM} />
                Zwróć
              </Button>
            )}

            <a
              href={`/reservations/${reservation.id}`}
              className="sm:ml-auto inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 px-3"
            >
              Zobacz Szczegóły
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
