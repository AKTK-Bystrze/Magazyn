import type { Enums } from "../../db/database.types";

/**
 * Equipment maintenance record
 * From maintenance_logs table
 */
export type MaintenanceLog = {
  id: string;
  equipmentId: string;
  previousStatus: Enums<"equipment_status"> | null;
  newStatus: Enums<"equipment_status">;
  notes: string | null;
  adminId: string | null;
  /** Username of the administrator joined from profiles table */
  adminUsername: string | null;
  createdAt: string;
};

/**
 * Command to create maintenance log (POST /equipment/:id/maintenance-logs)
 */
export type CreateMaintenanceLogCommand = {
  /** Maintenance notes or observations */
  notes?: string;
};
