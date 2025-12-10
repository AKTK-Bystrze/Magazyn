// =============================================================================
// TYPE RE-EXPORTS (Barrel Export)
// =============================================================================
// This file maintains backward compatibility by re-exporting all types
// from domain-specific files.

// Re-export database types (from original types.ts)
export type * from "../db/database.types";

// Auth types
export type * from "./auth.types";

// Equipment types (includes reservations, maintenance, etc.)
export type * from "./equipment.types";

// API types (pagination, errors, etc.)
export type * from "./api.types";

// Common types
export type * from "./common.types";
