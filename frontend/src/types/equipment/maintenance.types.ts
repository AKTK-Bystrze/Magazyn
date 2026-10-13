import type { Enums } from "../../db/database.types";
import type { Equipment } from "./equipment.types";

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
  adminUsername: string | null;
  createdAt: string;
};

/**
 * Command to create maintenance log (POST /equipment/:id/maintenance-logs)
 */
export type CreateMaintenanceLogCommand = {
  notes?: string;
};

/**
 * Equipment details with maintenance logs (GET /equipment/:id)
 */
export type EquipmentDetail = Equipment & {
  maintenanceLogs: MaintenanceLog[];
};
