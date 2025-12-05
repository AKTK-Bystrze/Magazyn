import { z } from 'zod';

// ============================================================================
// Equipment Command Schemas
// ============================================================================

/**
 * Schema for creating new equipment
 * Validates all required fields and constraints
 */
export const createEquipmentSchema = z.object({
  internal_id: z.string().min(1, 'Internal ID is required'),
  type_id: z.string().uuid('Type ID must be a valid UUID'),
  name: z.string().max(200, 'Name must not exceed 200 characters').optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['ok', 'broken']).optional().nullable().default('ok'),
  image_path: z.string().optional().nullable(),
});

export type CreateEquipmentCommand = z.infer<typeof createEquipmentSchema>;

/**
 * Schema for updating equipment
 * All fields are optional, but at least one must be provided
 */
export const updateEquipmentSchema = z
  .object({
    name: z.string().max(200, 'Name must not exceed 200 characters').optional().nullable(),
    description: z.string().optional().nullable(),
    status: z.enum(['ok', 'broken']).optional().nullable(),
    image_path: z.string().optional().nullable(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export type UpdateEquipmentCommand = z.infer<typeof updateEquipmentSchema>;

// ============================================================================
// Query Parameter Schemas
// ============================================================================

/**
 * Schema for equipment list query parameters
 * Handles pagination, filtering, and search
 */
export const equipmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  per_page: z.coerce
    .number()
    .int()
    .refine((val) => [10, 25, 50, 100].includes(val), {
      message: 'Per page must be one of: 10, 25, 50, 100',
    })
    .default(25),
  type_id: z.string().uuid('Type ID must be a valid UUID').optional(),
  search: z.string().optional(),
  status: z.enum(['ok', 'broken']).optional(),
  include_archived: z.coerce.boolean().default(false),
});

export type EquipmentListQuery = z.infer<typeof equipmentListQuerySchema>;

/**
 * Schema for equipment availability query
 * Validates date formats and ensures end_date >= start_date
 */
export const availabilityQuerySchema = z
  .object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end >= start;
    },
    {
      message: 'End date must be greater than or equal to start date',
      path: ['end_date'],
    }
  );

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

/**
 * Schema for UUID path parameter validation
 */
export const uuidParamSchema = z.string().uuid('ID must be a valid UUID');

// ============================================================================
// Response Type Definitions
// ============================================================================

export interface EquipmentDTO {
  id: string;
  internal_id: string;
  type_id: string;
  type_name: string;
  name: string | null;
  description: string | null;
  status: 'ok' | 'broken';
  credit_cost_per_day: number;
  image_url: string | null;
  is_favorite?: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MaintenanceLogDTO {
  id: string;
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  admin_username: string;
  created_at: string;
}

export interface EquipmentDetailDTO extends Omit<EquipmentDTO, 'is_favorite'> {
  maintenance_logs: MaintenanceLogDTO[];
}

export interface PaginationResponse {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export interface EquipmentListResponse {
  equipment: EquipmentDTO[];
  pagination: PaginationResponse;
}

export interface ConflictingReservation {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface AvailabilityResponse {
  equipment_id: string;
  is_available: boolean;
  conflicting_reservations: ConflictingReservation[];
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
