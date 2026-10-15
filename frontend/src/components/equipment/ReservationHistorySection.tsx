import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, CreditCard } from "lucide-react";
import { formatDateLocalized } from "@/lib/utils/date-utils";
import {
  EQUIPMENT_MANAGER_UI_STRINGS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_VARIANTS,
} from "@/lib/config/constants";
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
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  return RESERVATION_STATUS_VARIANTS[status] ?? "outline";
}

/**
 * Returns human-readable status label
 */
function getStatusLabel(status: string): string {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}

/**
 * Reservation history section showing recent rentals for equipment
 */
export function ReservationHistorySection({ reservations }: ReservationHistorySectionProps) {
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
        <div key={reservation.id} className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{reservation.username}</span>
            </div>
            <Badge variant={getStatusVariant(reservation.status)}>
              {getStatusLabel(reservation.status)}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              {formatDateLocalized(reservation.startDate)} →{" "}
              {formatDateLocalized(reservation.endDate)}
            </span>
          </div>

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
