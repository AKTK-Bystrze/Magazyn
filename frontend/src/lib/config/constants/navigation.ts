/**
 * Navigation labels and breadcrumb mappings (Polish)
 *
 * Centralized navigation strings used by nav-config.ts
 * and breadcrumb components.
 *
 * @module lib/config/constants/navigation
 */

/**
 * Navigation item labels (Polish)
 * Used by nav-config.ts for building navigation structure
 */
export const NAV_LABELS = {
  // User navigation
  DASHBOARD: "Panel",
  EQUIPMENT: "Sprzęt",
  RESERVATIONS: "Rezerwacje",
  CREDITS: "Godzinki",

  // Admin navigation
  OVERVIEW: "Przegląd",
  BROWSE_EQUIPMENT: "Przeglądaj Sprzęt",
  MANAGE_EQUIPMENT: "Zarządzaj Sprzętem",
  USERS: "Użytkownicy",
  ANALYTICS: "Analityka",
} as const;

/**
 * Breadcrumb segment label mappings
 * Maps URL segments to human-readable Polish labels
 */
export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Panel",
  equipment: "Sprzęt",
  reservations: "Rezerwacje",
  create: "Utwórz",
  credits: "Godzinki",
  history: "Historia",
  request: "Prośba",
  admin: "Administrator",
  users: "Użytkownicy",
  analytics: "Analityka",
  manage: "Zarządzaj",
};

/**
 * Paths where breadcrumbs should be hidden
 */
export const BREADCRUMB_HIDDEN_PATHS = ["/dashboard", "/admin", "/"];
