import type { EquipmentAvailability } from "@/types";
import { equipmentAvailabilityDTOSchema } from "@/lib/validators/availability.validator";
import { defaultLogger as logger } from "@/lib/utils/logger";

/**
 * Custom error class for availability transformation failures
 */
export class AvailabilityTransformError extends Error {
  constructor(
    message: string,
    public readonly data: unknown,
    public readonly validationErrors?: unknown
  ) {
    super(message);
    this.name = "AvailabilityTransformError";
  }
}

/**
 * Transforms backend equipment availability DTO to frontend type
 * Performs runtime validation and handles snake_case to camelCase conversion
 *
 * @param dto - Backend availability DTO with snake_case fields
 * @returns Frontend equipment availability with camelCase fields
 * @throws AvailabilityTransformError if validation fails
 */
export function transformEquipmentAvailabilityDTO(dto: unknown): EquipmentAvailability {
  // Runtime validation
  const validated = equipmentAvailabilityDTOSchema.safeParse(dto);

  if (!validated.success) {
    logger.error("Equipment availability DTO validation failed", {
      errors: validated.error.format(),
      receivedData: dto,
    });
    throw new AvailabilityTransformError(
      "Invalid availability data received from API",
      dto,
      validated.error.format()
    );
  }

  const data = validated.data;

  // Transform: snake_case → camelCase
  return {
    equipmentId: data.equipment_id,
    isAvailable: data.is_available,
    conflictingReservations: data.conflicting_reservations.map((r) => ({
      id: r.id,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status as "PENDING" | "RENTED" | "RETURNED" | "DENIED",
    })),
  };
}
