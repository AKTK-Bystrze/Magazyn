/**
 * Application Constants (Legacy Re-export)
 *
 * This file re-exports all constants from the new organized structure.
 * For new code, prefer importing directly from:
 *   - '@/lib/config/constants' (barrel)
 *   - '@/lib/config/constants/reservation' (domain-specific)
 *   - '@/lib/config/constants/equipment' (domain-specific)
 *   - '@/lib/config/constants/user' (domain-specific)
 *
 * @deprecated Import domain-specific constants from '@/lib/config/constants/reservation', '@/lib/config/constants/equipment', etc.
 * @module lib/config/constants.ts
 */

export * from "./constants/index";

export { VALIDATION_PATTERNS as USER_VALIDATION_PATTERNS } from "./constants/validation";
