import { z } from 'zod';

/**
 * Zod schema for conflicting reservation DTO from backend
 * Validates snake_case structure from API response
 */
const conflictingReservationDTOSchema = z.object({
  id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.string(),
});

/**
 * Zod schema for equipment availability DTO from backend
 * Validates the response from GET /equipment/:id/availability
 * 
 * Backend structure (snake_case):
 * - equipment_id: UUID of the equipment
 * - is_available: boolean availability status
 * - conflicting_reservations: array of conflicting reservations (optional)
 */
export const equipmentAvailabilityDTOSchema = z.object({
  equipment_id: z.string().uuid(),
  is_available: z.boolean(),
  conflicting_reservations: z.array(conflictingReservationDTOSchema).optional().default([]),
});
