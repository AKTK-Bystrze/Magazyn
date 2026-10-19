import { Badge } from "@/components/ui/badge";
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_VARIANTS,
  RESERVATION_FUTURE_STATUS_LABEL,
  RESERVATION_OVERDUE_STATUS_LABEL,
  MIXED_STATUS,
} from "@/lib/config/constants";
import { getTodayAsString } from "@/lib/utils/date-utils";
import type { Enums } from "@/db/database.types";

interface StatusBadgeProps {
  status: Enums<"reservation_status"> | typeof MIXED_STATUS | string;
  startDate?: string | null;
  endDate?: string | null;
  className?: string;
  "data-testid"?: string;
}

/**
 * Displays a reservation status as a styled badge
 * Automatically applies variant and label based on status
 *
 * @param status - Reservation status from database enum
 * @param startDate - Optional start date to distinguish future pending reservations
 * @param endDate - Optional end date to distinguish overdue pending reservations
 * @param className - Optional additional CSS classes
 */
export function StatusBadge({
  status,
  startDate,
  endDate,
  className,
  "data-testid": testId,
}: StatusBadgeProps) {
  if (status === MIXED_STATUS) {
    return (
      <Badge variant="outline" className={className} data-testid={testId}>
        Mixed
      </Badge>
    );
  }

  const today = getTodayAsString();
  const startDay = startDate
    ? startDate.includes("T")
      ? startDate.split("T")[0]
      : startDate
    : null;
  const endDay = endDate ? (endDate.includes("T") ? endDate.split("T")[0] : endDate) : null;

  const isOverdue = Boolean(status === "PENDING" && endDay && endDay < today);
  const isFuture = Boolean(status === "PENDING" && !isOverdue && startDay && startDay > today);

  if (status === "PENDING") {
    if (isOverdue) {
      return (
        <Badge variant="destructive" className={className} data-testid={testId}>
          {RESERVATION_OVERDUE_STATUS_LABEL}
        </Badge>
      );
    }

    const label = isFuture
      ? RESERVATION_FUTURE_STATUS_LABEL
      : (RESERVATION_STATUS_LABELS[status] ?? status);

    return (
      <Badge
        className={`bg-green-500 hover:bg-green-600 text-white border-transparent ${className || ""}`}
        data-testid={testId}
      >
        {label}
      </Badge>
    );
  }

  const variant = RESERVATION_STATUS_VARIANTS[status] ?? "outline";
  const label = RESERVATION_STATUS_LABELS[status] ?? status;

  return (
    <Badge variant={variant} className={className} data-testid={testId}>
      {label}
    </Badge>
  );
}
