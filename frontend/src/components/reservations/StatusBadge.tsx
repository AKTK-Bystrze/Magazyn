import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_VARIANTS,
  MIXED_STATUS,
} from "@/lib/config/constants";
import type { Enums } from "@/db/database.types";

interface StatusBadgeProps {
  status: Enums<"reservation_status"> | typeof MIXED_STATUS | string;
  className?: string;
}

/**
 * Displays a reservation status as a styled badge
 * Automatically applies variant and label based on status
 *
 * @param status - Reservation status from database enum
 * @param className - Optional additional CSS classes
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status === MIXED_STATUS) {
    return (
      <Badge variant="outline" className={className}>
        Mixed
      </Badge>
    );
  }

  const variant = RESERVATION_STATUS_VARIANTS[status] ?? "outline";
  const label = RESERVATION_STATUS_LABELS[status] ?? status;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
