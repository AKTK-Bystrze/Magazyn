/**
 * Navigation Configuration
 *
 * Central configuration for navigation items, labels, and theme settings.
 * Used by TopNavBar, DesktopLinks, MobileMenu, and Breadcrumbs components.
 *
 * @module lib/config/nav-config
 */
import type { ComponentType } from "react";
import { ROUTES } from "./routes";
import { STORAGE_KEY_THEME } from "./constants";

/**
 * Navigation item definition
 */
export interface NavItem {
  /** Display label for the link */
  label: string;
  /** Route path (use ROUTES constants) */
  href: string;
  /** Optional icon component */
  icon?: ComponentType<{ className?: string }>;
  /** Regex pattern to match active state for nested routes */
  activePattern: RegExp;
}

/**
 * Navigation items for standard users
 */
export const USER_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: ROUTES.PROTECTED.DASHBOARD,
    activePattern: /^\/dashboard$/,
  },
  {
    label: "Equipment",
    href: ROUTES.PUBLIC.EQUIPMENT,
    activePattern: /^\/equipment/,
  },
  {
    label: "Reservations",
    href: ROUTES.PROTECTED.RESERVATIONS,
    activePattern: /^\/reservations/,
  },
  {
    label: "Credits",
    href: ROUTES.PROTECTED.CREDITS_HISTORY,
    activePattern: /^\/credits/,
  },
];

/**
 * Navigation items for admin users
 */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: ROUTES.PROTECTED.ADMIN,
    activePattern: /^\/admin$/,
  },
  {
    label: "Reservations",
    href: ROUTES.PROTECTED.ADMIN_RESERVATIONS,
    activePattern: /^\/admin\/reservations/,
  },
  {
    label: "Equipment",
    href: ROUTES.PROTECTED.ADMIN_EQUIPMENT,
    activePattern: /^\/admin\/equipment/,
  },
  {
    label: "Users",
    href: ROUTES.PROTECTED.ADMIN_USERS,
    activePattern: /^\/admin\/users/,
  },
  {
    label: "Analytics",
    href: ROUTES.PROTECTED.ADMIN_ANALYTICS,
    activePattern: /^\/admin\/analytics/,
  },
];

/**
 * Local storage key for theme preference
 * Re-exported from constants for convenience
 */
export const THEME_STORAGE_KEY = STORAGE_KEY_THEME;

/**
 * Theme values
 */
export const THEME = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

export type Theme = (typeof THEME)[keyof typeof THEME];

/**
 * Breadcrumb segment label mappings
 * Maps URL segments to human-readable labels
 */
export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  equipment: "Equipment",
  reservations: "Reservations",
  create: "Create",
  credits: "Credits",
  history: "History",
  request: "Request",
  admin: "Admin",
  users: "Users",
  analytics: "Analytics",
};

/**
 * Paths where breadcrumbs should be hidden
 */
export const BREADCRUMB_HIDDEN_PATHS = ["/dashboard", "/admin", "/"];
