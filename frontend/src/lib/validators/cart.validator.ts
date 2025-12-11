import { z } from "zod";

/**
 * Zod schema for validating CartItem from untrusted sources (e.g., sessionStorage)
 * Ensures runtime type safety when loading persisted data
 */
export const cartItemSchema = z.object({
  equipmentId: z.string().uuid(),
  name: z.string().min(1),
  typeName: z.string().min(1),
  description: z.string().nullable(),
  creditCostPerDay: z.number().int().min(0),
  imageUrl: z.string().nullable(),
});

/**
 * Zod schema for validating CartState from untrusted sources
 * Validates the entire cart structure including items and dates
 */
export const cartStateSchema = z.object({
  items: z.array(cartItemSchema),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});
