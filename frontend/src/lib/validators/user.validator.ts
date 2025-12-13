import { z } from 'zod';
import { paginationResponseDTOSchema } from './equipment.validator';
import { USER_VALIDATION_PATTERNS } from '@/lib/config/constants';

// =============================================================================
// USER DTO VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for validating backend UserDTO responses
 * Provides runtime validation to catch API contract violations
 */
export const userDTOSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
  email: z.string().email('Invalid email format'),
  username: z.string().min(1, 'Username is required'),
  role: z.enum(['user', 'admin', 'super_admin'], {
    errorMap: () => ({ message: 'Role must be one of: user, admin, super_admin' }),
  }),
  credit_balance: z.number().int().min(0, 'Credit balance must be non-negative'),
  is_enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

/**
 * Zod schema for user list response
 * Reuses paginationResponseDTOSchema from equipment.validator.ts
 */
export const userListResponseDTOSchema = z.object({
  users: z.array(userDTOSchema),
  pagination: paginationResponseDTOSchema,
});

// =============================================================================
// USER COMMAND VALIDATION SCHEMAS (for API input)
// =============================================================================

/**
 * Zod schema for create user command validation
 * Used in API routes to validate request body
 */
export const createUserCommandSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(1, 'Username is required')
    .regex(USER_VALIDATION_PATTERNS.USERNAME, 'Username can only contain letters, numbers, and underscores'),
  role: z.enum(['user', 'admin', 'super_admin'], {
    errorMap: () => ({ message: 'Role must be one of: user, admin, super_admin' }),
  }),
  credit_balance: z.number().int().min(0, 'Credit balance must be non-negative').optional().default(0),
  is_enabled: z.boolean().optional().default(true),
});

/**
 * Zod schema for update user command validation
 * All fields are optional (partial update)
 */
export const updateUserCommandSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  role: z.enum(['user', 'admin', 'super_admin'], {
    errorMap: () => ({ message: 'Role must be one of: user, admin, super_admin' }),
  }).optional(),
  credit_balance: z.number().int().min(0, 'Credit balance must be non-negative').optional(),
  is_enabled: z.boolean().optional(),
});

/**
 * Zod schema for user list query parameters
 * Used in API routes to validate query params
 */
export const userListQuerySchema = z.object({
  search: z.string().max(255).optional(),
  role: z.enum(['user', 'admin', 'super_admin', 'ALL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(25),
});

// Type exports
export type UserDTO = z.infer<typeof userDTOSchema>;
export type UserListResponseDTO = z.infer<typeof userListResponseDTOSchema>;
export type CreateUserCommandInput = z.infer<typeof createUserCommandSchema>;
export type UpdateUserCommandInput = z.infer<typeof updateUserCommandSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
