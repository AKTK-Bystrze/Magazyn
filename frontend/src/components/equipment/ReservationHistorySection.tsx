import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, CreditCard } from "lucide-react";
import { formatDateLocalized } from "@/lib/utils/date-utils";
import { EQUIPMENT_MANAGER_UI_STRINGS } from "@/lib/config/constants";
import type { EquipmentReservationHistoryItem } from "@/types";

const UI = EQUIPMENT_MANAGER_UI_STRINGS;

/**
 * Props for ReservationHistorySection component
 */
interface ReservationHistorySectionProps {
  /** List of reservation history items */
  reservations: EquipmentReservationHistoryItem[];
}

/**
 * Returns badge variant based on reservation status
 */
function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "RENTED":
      return "default";
    case "RETURNED":
      return "secondary";
    case "PENDING":
      return "outline";
    case "DENIED":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Returns human-readable status label
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "RENTED":
      return "Rented";
    case "RETURNED":
      return "Returned";
    case "PENDING":
      return "Pending";
    case "DENIED":
      return "Denied";
    default:
      return status;
  }
}

/**
 * Reservation history section showing recent rentals for equipment
 */
export function ReservationHistorySection({
  reservations,
}: ReservationHistorySectionProps) {
  if (reservations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{UI.NO_RESERVATION_HISTORY}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((reservation) => (
        <div
          key={reservation.id}
          className="rounded-lg border bg-card p-3 space-y-2"
        >
          {/* Header: User and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{reservation.username}</span>
            </div>
            <Badge variant={getStatusVariant(reservation.status)}>
              {getStatusLabel(reservation.status)}
            </Badge>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              {formatDateLocalized(reservation.startDate)} →{" "}
              {formatDateLocalized(reservation.endDate)}
            </span>
          </div>

          {/* Credits */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>{reservation.creditCost} credits</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDateLocalized(reservation.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
