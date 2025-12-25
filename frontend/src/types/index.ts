// =============================================================================
// TYPE RE-EXPORTS (Barrel Export)
// =============================================================================
// This file maintains backward compatibility by re-exporting all types
// from domain-specific files.

// Re-export database types (from original types.ts)
export type * from "../db/database.types";

// Auth types
export type * from "./auth.types";

// Equipment domain (split from equipment.types.ts)
export * from "./equipment";

// Reservations domain (split from equipment.types.ts)
export * from "./reservations";

// Credits domain (split from equipment.types.ts)
export * from "./credits";

// Analytics domain (split from equipment.types.ts)
export * from "./analytics";

// API types (pagination, errors, etc.)
export type * from "./api.types";

// Common types
export type * from "./common.types";

// Reservation cart types
export type * from "./reservation-cart.types";
