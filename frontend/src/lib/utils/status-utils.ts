import { RESERVATION_STATUS } from "@/lib/config/constants";
import type { Enums } from "@/db/database.types";

/**
 * Configuration for available status actions based on role and current status
 */
export type StatusActionConfig = {
  /** Whether user can cancel (change to DENIED) */
  canCancel: boolean;
  /** Whether user can mark as returned */
  canMarkReturned: boolean;
  /** Whether admin can change status via dropdown */
  canChangeStatus: boolean;
  /** Valid status transitions for dropdown */
  availableStatuses: Enums<"reservation_status">[];
};

/**
 * Determines which status change actions are available
 * for the given reservation state and user permissions
 *
 * @param currentStatus - Current reservation status
 * @param isOwner - Whether the user owns this reservation
 * @param isAdmin - Whether the user is an admin
 * @returns Available actions configuration
 */
export function canChangeStatus(
  currentStatus: Enums<"reservation_status">,
  isOwner: boolean,
  isAdmin: boolean
): StatusActionConfig {
  // Final states cannot be modified
  if (isStatusFinal(currentStatus)) {
    return {
      canCancel: false,
      canMarkReturned: false,
      canChangeStatus: false,
      availableStatuses: [],
    };
  }

  // Regular user actions (own reservations only)
  if (isOwner && !isAdmin) {
    return {
      canCancel: currentStatus === RESERVATION_STATUS.PENDING,
      canMarkReturned:
        currentStatus === RESERVATION_STATUS.PENDING ||
        currentStatus === RESERVATION_STATUS.RENTED,
      canChangeStatus: false,
      availableStatuses: [],
    };
  }

  // Admin actions
  if (isAdmin) {
    return {
      canCancel: currentStatus === RESERVATION_STATUS.PENDING,
      canMarkReturned:
        currentStatus === RESERVATION_STATUS.PENDING ||
        currentStatus === RESERVATION_STATUS.RENTED,
      canChangeStatus: true,
      availableStatuses: getAvailableTransitions(currentStatus, isAdmin),
    };
  }

  // Not owner and not admin -> no actions
  return {
    canCancel: false,
    canMarkReturned: false,
    canChangeStatus: false,
    availableStatuses: [],
  };
}

/**
 * Gets valid status transitions from current status
 * Based on business rules from PRD
 *
 * @param currentStatus - Current reservation status
 * @param isAdmin - Whether the requesting user is admin
 * @returns Array of valid target statuses
 */
export function getAvailableTransitions(
  currentStatus: Enums<"reservation_status">,
  isAdmin: boolean
): Enums<"reservation_status">[] {
  // Only admins can use dropdown, but keep isAdmin for future rules
  if (!isAdmin) {
    return [];
  }

  switch (currentStatus) {
    case RESERVATION_STATUS.PENDING:
      return [
        RESERVATION_STATUS.RENTED,
        RESERVATION_STATUS.RETURNED,
        RESERVATION_STATUS.DENIED,
      ];
    case RESERVATION_STATUS.RENTED:
      return [RESERVATION_STATUS.RETURNED];
    case RESERVATION_STATUS.RETURNED:
    case RESERVATION_STATUS.DENIED:
      return []; // Final states
    default:
      return [];
  }
}

/**
 * Checks if a reservation status is final (cannot be changed)
 *
 * @param status - Reservation status to check
 * @returns True if status is final
 */
export function isStatusFinal(
  status: Enums<"reservation_status">
): boolean {
  return (
    status === RESERVATION_STATUS.RETURNED ||
    status === RESERVATION_STATUS.DENIED
  );
}
