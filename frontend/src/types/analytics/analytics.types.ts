// =============================================================================
// CALENDAR & ANALYTICS TYPES
// =============================================================================

import type { Enums } from "../../db/database.types";

/**
 * Single day availability status (GET /calendar/availability)
 */
export type CalendarDay = {
  date: string; // YYYY-MM-DD
  equipmentId: string;
  equipmentName: string;
  isAvailable: boolean;
  reservationId: string | null;
  reservationStatus: Enums<"reservation_status"> | null;
};

/**
 * Top equipment renter info
 */
export type TopRenter = {
  userId: string;
  username: string;
  reservationCount: number;
  daysRented: number;
};

/**
 * Equipment usage statistics (GET /analytics/equipment-stats)
 */
export type EquipmentStats = {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  totalReservations: number;
  totalDaysRented: number;
  utilizationRate: number; // 0.0 to 1.0
  topRenters: TopRenter[];
};

/**
 * User activity statistics (GET /analytics/user-stats)
 */
export type UserStats = {
  userId: string;
  username: string;
  totalReservations: number;
  totalCreditsSpent: number;
  lastReservationDate: string | null;
  favoriteEquipmentType: string | null;
};

/**
 * Analytics period filter
 */
export type AnalyticsPeriod = {
  year: number;
  month: number | null; // 1-12, null for entire year
};
