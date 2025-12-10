import { z } from 'zod';

/**
 * Equipment query parameters validation schema
 * Ensures all query parameters are within acceptable ranges
 */
export const equipmentQuerySchema = z.object({
  search: z.string().min(1).max(255).optional(),
  type_id: z.string().uuid().optional(),
  status: z.enum(['ok', 'broken', 'blocked']).optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(25),
});

export type EquipmentQuery = z.infer<typeof equipmentQuerySchema>;

/**
 * Equipment types query parameters validation schema
 */
export const equipmentTypesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  per_page: z.coerce.number().int().positive().max(100).default(25).optional(),
});

export type EquipmentTypesQuery = z.infer<typeof equipmentTypesQuerySchema>;
