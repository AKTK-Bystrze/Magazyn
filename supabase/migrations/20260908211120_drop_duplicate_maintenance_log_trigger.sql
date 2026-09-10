-- Migration: Drop DB trigger that duplicates status-change maintenance logs.
--
-- Root cause: equipmentService.Update() already creates a maintenance log via
-- the service layer (with the correct admin_id). The trigger log_equipment_status_change
-- fires an additional INSERT into maintenance_logs on every equipment UPDATE where
-- status changes, resulting in two identical log entries -- one correctly attributed
-- to the user, one attributed to System (NULL admin_id under service role context).
--
-- Fix: Remove the trigger. The service layer is the single source of truth for
-- status-change logging, which ensures correct user attribution.

DROP TRIGGER IF EXISTS log_equipment_status_change ON equipment;
DROP FUNCTION IF EXISTS log_maintenance_change();
