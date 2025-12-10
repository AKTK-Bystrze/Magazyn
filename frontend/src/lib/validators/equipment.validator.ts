import { z } from 'zod';

/**
 * Zod schema for validating backend EquipmentDTO responses
 * Provides runtime validation to catch API contract violations
 */
export const equipmentDTOSchema = z.object({
  id: z.string().uuid('Equipment ID must be a valid UUID'),
  internal_id: z.string().min(1, 'Internal ID is required'),
  type_id: z.string().uuid('Type ID must be a valid UUID'),
  type_name: z.string().min(1, 'Type name is required'),
  name: z.string().nullable(),
  description: z.string().nullable(),
  status: z.enum(['ok', 'broken'], {
    errorMap: () => ({ message: 'Status must be either "ok" or "broken"' }),
  }),
  credit_cost_per_day: z.number().int().min(0, 'Credit cost must be non-negative'),
  image_url: z.string().nullable(),
  is_favorite: z.boolean().optional(),
  is_archived: z.boolean(),
  created_at: z.string(), // ISO 8601 string from backend
  updated_at: z.string().optional(),
});

/**
 * Zod schema for pagination response
 */
export const paginationResponseDTOSchema = z.object({
  page: z.number().int().min(1),
  per_page: z.number().int().min(1),
  total_items: z.number().int().min(0),
  total_pages: z.number().int().min(0),
});

/**
 * Zod schema for equipment list response
 */
export const equipmentListResponseDTOSchema = z.object({
  equipment: z.array(equipmentDTOSchema),
  pagination: paginationResponseDTOSchema,
});

/**
 * Zod schema for equipment type DTO
 */
export const equipmentTypeDTOSchema = z.object({
  id: z.string().uuid('Equipment type ID must be a valid UUID'),
  name: z.string().min(1, 'Type name is required'),
  credit_cost_per_day: z.number().int().min(0, 'Credit cost must be non-negative'),
  created_at: z.string(), // ISO 8601 string from backend
});

/**
 * Zod schema for equipment types list response
 */
export const equipmentTypesResponseDTOSchema = z.object({
  equipment_types: z.array(equipmentTypeDTOSchema),
});
