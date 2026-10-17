import type { EquipmentAvailability } from "@/types";
import { equipmentAvailabilityDTOSchema } from "@/lib/validators/availability.validator";
import { defaultLogger as logger } from "@/lib/utils/logger";

/**
 * Transforms backend equipment availability DTO to frontend type
 * Performs runtime validation and handles snake_case to camelCase conversion
 *
 * @param dto - Backend availability DTO with snake_case fields
 * @returns Frontend equipment availability with camelCase fields
 * @throws Error if validation fails
 */
export function transformEquipmentAvailabilityDTO(dto: unknown): EquipmentAvailability {
  const validated = equipmentAvailabilityDTOSchema.safeParse(dto);

  if (!validated.success) {
    logger.error("Equipment availability DTO validation failed", {
      errors: validated.error.format(),
      receivedData: dto,
    });
    throw new Error("Invalid availability data received from API");
  }

  const data = validated.data;

  return {
    equipmentId: data.equipment_id,
    isAvailable: data.is_available,
    conflictingReservations: data.conflicting_reservations.map((r) => ({
      id: r.id,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status as "PENDING" | "RENTED" | "RETURNED" | "CANCELLED",
    })),
  };
}
