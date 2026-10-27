import type { EquipmentSearchItem, EquipmentType, PaginationMeta } from "@/types";
import { defaultLogger as logger } from "@/lib/utils/logger";
import {
  equipmentDTOSchema,
  equipmentListResponseDTOSchema,
  equipmentTypeDTOSchema,
  equipmentTypesResponseDTOSchema,
} from "@/lib/validators/equipment.validator";

/**
 * Transforms backend EquipmentDTO to frontend EquipmentSearchItem
 * Performs runtime validation and handles snake_case to camelCase conversion
 *
 * @param dto - Backend equipment DTO with snake_case fields
 * @returns Frontend equipment search item with camelCase fields and nested type
 * @throws Error if validation fails
 */
export function transformEquipmentDTO(dto: unknown): EquipmentSearchItem {
  const validated = equipmentDTOSchema.safeParse(dto);

  if (!validated.success) {
    logger.error("Equipment DTO validation failed", {
      errors: validated.error.format(),
      receivedData: dto,
    });
    throw new Error("Invalid equipment data received from API");
  }

  const equipment = validated.data;

  return {
    id: equipment.id,
    name: equipment.name ?? "Unnamed Equipment",
    description: equipment.description,
    typeId: equipment.type_id,
    type: {
      id: equipment.type_id,
      name: equipment.type_name,
      creditCostPerDay: equipment.credit_cost_per_day,
    },
    status: equipment.status as "ok" | "broken" | "blocked",
    imagePath: equipment.image_url,
    internalId: equipment.internal_id,
    isFavorite: equipment.is_favorite ?? false,
  };
}

/**
 * Transforms backend equipment list response to frontend format
 *
 * @param response - Backend equipment list response DTO
 * @returns Object with transformed equipment array and pagination metadata
 * @throws EquipmentTransformError if validation fails
 */
export function transformEquipmentListResponse(response: unknown): {
  equipment: EquipmentSearchItem[];
  pagination: PaginationMeta;
} {
  const validated = equipmentListResponseDTOSchema.safeParse(response);

  if (!validated.success) {
    logger.error("Equipment list response validation failed", {
      errors: JSON.stringify(validated.error.format(), null, 2),
      receivedData: JSON.stringify(response, null, 2),
    });
    throw new Error("Invalid equipment list data received from API");
  }

  const data = validated.data;

  return {
    equipment: data.equipment.map(transformEquipmentDTO),
    pagination: {
      page: data.pagination.page,
      perPage: data.pagination.per_page,
      totalItems: data.pagination.total_items,
      totalPages: data.pagination.total_pages,
    },
  };
}

/**
 * Transforms backend EquipmentTypeDTO to frontend EquipmentType
 *
 * @param dto - Backend equipment type DTO with snake_case fields
 * @returns Frontend equipment type with camelCase fields
 * @throws Error if validation fails
 */
function transformEquipmentTypeDTO(dto: unknown): EquipmentType {
  const validated = equipmentTypeDTOSchema.safeParse(dto);

  if (!validated.success) {
    logger.error("Equipment type DTO validation failed", {
      errors: validated.error.format(),
      receivedData: dto,
    });
    throw new Error("Invalid equipment type data received from API");
  }

  const equipmentType = validated.data;

  return {
    id: equipmentType.id,
    name: equipmentType.name,
    creditCostPerDay: equipmentType.credit_cost_per_day,
    createdAt: equipmentType.created_at,
  };
}

/**
 * Transforms backend equipment types list response to frontend format
 *
 * @param response - Backend equipment types list response DTO
 * @returns Array of transformed equipment types
 * @throws Error if validation fails
 */
export function transformEquipmentTypesResponse(response: unknown): EquipmentType[] {
  const validated = equipmentTypesResponseDTOSchema.safeParse(response);

  if (!validated.success) {
    logger.error("Equipment types response validation failed", {
      errors: validated.error.format(),
      receivedData: response,
    });
    throw new Error("Invalid equipment types data received from API");
  }

  return validated.data.equipment_types.map(transformEquipmentTypeDTO);
}
