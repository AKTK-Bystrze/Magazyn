import type { CreateReservationsCommand, CreateReservationItem } from '@/types';

/**
 * Transforms frontend CreateReservationsCommand to backend format
 * Converts camelCase to snake_case for API submission
 *
 * @param command - Frontend reservation command with camelCase fields
 * @returns Backend-compatible object with snake_case fields
 */
export function transformCreateReservationsCommand(command: CreateReservationsCommand): unknown {
  return {
    reservations: command.reservations.map((item) => ({
      equipment_id: item.equipmentId,
      start_date: item.startDate,
      end_date: item.endDate,
    })),
    ...(command.userId && { user_id: command.userId }),
  };
}

/**
 * Transforms a single reservation item from frontend to backend format
 *
 * @param item - Frontend reservation item with camelCase fields
 * @returns Backend-compatible object with snake_case fields
 */
export function transformCreateReservationItem(item: CreateReservationItem): unknown {
  return {
    equipment_id: item.equipmentId,
    start_date: item.startDate,
    end_date: item.endDate,
  };
}
