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
import {
  STORAGE_KEY_THEME,
  NAV_LABELS,
  BREADCRUMB_LABELS,
  BREADCRUMB_HIDDEN_PATHS,
} from "./constants";

import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  CreditCard,
  Users,
  BarChart,
  Package,
} from "lucide-react";

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
    label: NAV_LABELS.DASHBOARD,
    href: ROUTES.PROTECTED.DASHBOARD,
    icon: LayoutDashboard,
    activePattern: /^\/dashboard$/,
  },
  {
    label: NAV_LABELS.EQUIPMENT,
    href: ROUTES.PUBLIC.EQUIPMENT,
    icon: Wrench,
    activePattern: /^\/equipment/,
  },
  {
    label: NAV_LABELS.RESERVATIONS,
    href: ROUTES.PROTECTED.RESERVATIONS,
    icon: CalendarDays,
    activePattern: /^\/reservations/,
  },
  {
    label: NAV_LABELS.CREDITS,
    href: ROUTES.PROTECTED.CREDITS_HISTORY,
    icon: CreditCard,
    activePattern: /^\/credits/,
  },
];

/**
 * Navigation items for admin users
 */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: NAV_LABELS.OVERVIEW,
    href: ROUTES.PROTECTED.ADMIN,
    icon: LayoutDashboard,
    activePattern: /^\/admin$/,
  },
  {
    label: NAV_LABELS.RESERVATIONS,
    href: ROUTES.PROTECTED.ADMIN_RESERVATIONS,
    icon: CalendarDays,
    activePattern: /^\/admin\/reservations/,
  },
  {
    label: NAV_LABELS.BROWSE_EQUIPMENT,
    href: ROUTES.PROTECTED.ADMIN_EQUIPMENT,
    icon: Package,
    activePattern: /^\/admin\/equipment$/,
  },
  {
    label: NAV_LABELS.MANAGE_EQUIPMENT,
    href: ROUTES.PROTECTED.ADMIN_EQUIPMENT_MANAGE,
    icon: Wrench,
    activePattern: /^\/admin\/equipment\/manage/,
  },
  {
    label: NAV_LABELS.USERS,
    href: ROUTES.PROTECTED.ADMIN_USERS,
    icon: Users,
    activePattern: /^\/admin\/users/,
  },
  {
    label: NAV_LABELS.ANALYTICS,
    href: ROUTES.PROTECTED.ADMIN_ANALYTICS,
    icon: BarChart,
    activePattern: /^\/admin\/analytics/,
  },
  {
    label: NAV_LABELS.CREDITS,
    href: ROUTES.PROTECTED.CREDITS_HISTORY,
    icon: CreditCard,
    activePattern: /^\/credits/,
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

// Re-export breadcrumb config from constants (for backward compatibility)
export { BREADCRUMB_LABELS, BREADCRUMB_HIDDEN_PATHS };

