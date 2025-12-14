import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { Calendar, CreditCard, Edit2, User, X } from "lucide-react";
import { formatDate, calculateDays } from "@/lib/utils/date-utils";
import { pluralize } from "@/lib/utils/text-utils";
import { ICON_SIZE_SM, RESERVATION_STATUS } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import type { ReservationListItem } from "@/types";

interface ReservationCardProps {
  reservation: ReservationListItem;
  mode: "user" | "admin";
  /** Highlight this card as the current user's reservation (in 'all' view) */
  isOwn?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
  onModify?: (reservation: ReservationListItem) => void;
  onCancel?: (reservation: ReservationListItem) => void;
  onViewDetails?: (reservation: ReservationListItem) => void;
}

/**
 * Displays a single reservation as a card
 * Shows equipment info, dates, status, and available actions
 *
 * @param reservation - Reservation data
 * @param mode - View mode (user or admin)
 * @param onModify - Callback for modify action (PENDING only)
 * @param onCancel - Callback for cancel action (PENDING only)
 * @param onViewDetails - Callback for view details action
 */
export function ReservationCard({
  reservation,
  mode,
  isOwn = false,
  showActions = true,
  onModify,
  onCancel,
  onViewDetails,
}: ReservationCardProps) {
  const isPending = reservation.status === RESERVATION_STATUS.PENDING;
  const days = calculateDays(reservation.startDate, reservation.endDate);

  const handleModify = React.useCallback(() => {
    onModify?.(reservation);
  }, [onModify, reservation]);

  const handleCancel = React.useCallback(() => {
    onCancel?.(reservation);
  }, [onCancel, reservation]);

  const handleViewDetails = React.useCallback(() => {
    onViewDetails?.(reservation);
  }, [onViewDetails, reservation]);

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow",
        isOwn && "ring-2 ring-primary/30 bg-primary/5"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg truncate">
                {reservation.equipmentName}
              </h3>
              {isOwn && (
                <Badge variant="secondary" className="text-xs">
                  Your reservation
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {reservation.equipmentType}
            </p>
          </div>
          <StatusBadge status={reservation.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User (Admin view or All Reservations view) */}
        {(mode === "admin" || !isOwn) && (
          <div className="flex items-center gap-2 text-sm">
            <User className={ICON_SIZE_SM + " text-muted-foreground"} />
            <span className="font-medium text-foreground">
              {reservation.username}
            </span>
          </div>
        )}
        {/* Date Range */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className={ICON_SIZE_SM + " text-muted-foreground"} />
          <span>
            {formatDate(reservation.startDate)} — {formatDate(reservation.endDate)}
          </span>
          <span className="text-muted-foreground">
            ({days} {pluralize(days, "day")})
          </span>
        </div>

        {/* Cost */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className={ICON_SIZE_SM + " text-muted-foreground"} />
          <span className="font-medium">{reservation.creditCost} credits</span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2">
            {isPending && onModify && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleModify}
                className="flex items-center gap-1"
              >
                <Edit2 className={ICON_SIZE_SM} />
                Modify
              </Button>
            )}

            {isPending && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex items-center gap-1 text-destructive hover:text-destructive"
              >
                <X className={ICON_SIZE_SM} />
                Cancel
              </Button>
            )}

            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewDetails}
                className="ml-auto"
              >
                View Details
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
