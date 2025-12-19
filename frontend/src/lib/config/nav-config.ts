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

import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  CreditCard,
  Users,
  BarChart
} from 'lucide-react';

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
    icon: LayoutDashboard,
    activePattern: /^\/dashboard$/,
  },
  {
    label: "Equipment",
    href: ROUTES.PUBLIC.EQUIPMENT,
    icon: Wrench,
    activePattern: /^\/equipment/,
  },
  {
    label: "Reservations",
    href: ROUTES.PROTECTED.RESERVATIONS,
    icon: CalendarDays,
    activePattern: /^\/reservations/,
  },
  {
    label: "Credits",
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
    label: "Overview",
    href: ROUTES.PROTECTED.ADMIN,
    icon: LayoutDashboard,
    activePattern: /^\/admin$/,
  },
  {
    label: "Reservations",
    href: ROUTES.PROTECTED.ADMIN_RESERVATIONS,
    icon: CalendarDays,
    activePattern: /^\/admin\/reservations/,
  },
  {
    label: "Browse Equipment",
    href: ROUTES.PROTECTED.ADMIN_EQUIPMENT,
    icon: Wrench,
    activePattern: /^\/admin\/equipment$/,
  },
  {
    label: "Manage Equipment",
    href: ROUTES.PROTECTED.ADMIN_EQUIPMENT_MANAGE,
    icon: Wrench,
    activePattern: /^\/admin\/equipment\/manage/,
  },
  {
    label: "Users",
    href: ROUTES.PROTECTED.ADMIN_USERS,
    icon: Users,
    activePattern: /^\/admin\/users/,
  },
  {
    label: "Analytics",
    href: ROUTES.PROTECTED.ADMIN_ANALYTICS,
    icon: BarChart,
    activePattern: /^\/admin\/analytics/,
  },
  {
    label: "Credits",
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
  manage: "Manage",
};

/**
 * Paths where breadcrumbs should be hidden
 */
export const BREADCRUMB_HIDDEN_PATHS = ["/dashboard", "/admin", "/"];
