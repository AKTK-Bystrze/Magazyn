-- Migration: Logic and RLS
-- Description: Trigger Functions, Triggers, and RLS Policies
-- Note: Helper functions (is_admin, is_super_admin, is_enabled, get_user_role) are in base.sql

-- =====================================================
-- TRIGGER FUNCTIONS (with SET search_path for security)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at() 
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $body$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $body$;

CREATE OR REPLACE FUNCTION public.set_user_role_metadata() 
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN 
  IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'role' IS NULL THEN 
    NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || '{"role": "user"}'::jsonb; 
  END IF; 
  RETURN NEW; 
END; $body$;

-- Note: create_user_profile trigger is NOT created - profile creation is superAdmin-only via API

CREATE OR REPLACE FUNCTION log_maintenance_change() 
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN 
  IF OLD.status IS DISTINCT FROM NEW.status THEN 
    INSERT INTO maintenance_logs (equipment_id, previous_status, new_status, admin_id) 
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid()); 
  END IF; 
  RETURN NEW; 
END; $body$;

CREATE OR REPLACE FUNCTION log_reservation_change() 
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE v_changed_by UUID;
BEGIN 
  v_changed_by := NULLIF(current_setting('app.changed_by_user_id', true), '')::UUID; 
  IF v_changed_by IS NULL THEN v_changed_by := auth.uid(); END IF;
  INSERT INTO reservation_history (reservation_id, user_id, equipment_id, start_date, end_date, status, changed_by_user_id)
  VALUES (NEW.id, NEW.user_id, NEW.equipment_id, NEW.start_date, NEW.end_date, NEW.status, v_changed_by);
  RETURN NEW;
END; $body$;

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER update_credit_requests_updated_at BEFORE UPDATE ON credit_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_user_role_metadata_trigger BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.set_user_role_metadata();
-- Note: create_user_profile_trigger is intentionally NOT created - superAdmin creates profiles via API
CREATE TRIGGER log_equipment_status_change AFTER UPDATE ON equipment FOR EACH ROW EXECUTE PROCEDURE log_maintenance_change();
CREATE TRIGGER log_reservation_changes AFTER INSERT OR UPDATE ON reservations FOR EACH ROW EXECUTE PROCEDURE log_reservation_change();

-- =====================================================
-- RLS POLICIES
-- All policies require is_enabled() check for disabled user blackout
-- =====================================================

-- PROFILES
-- All enabled users can view all profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated 
  USING (is_enabled());
-- Only superAdmin can create profiles
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated 
  WITH CHECK (is_super_admin());
-- Only superAdmin can update profiles (including credits, role, is_enabled)
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated 
  USING (is_super_admin());

-- EQUIPMENT_TYPES
-- All authenticated users can view equipment types (public catalog data)
CREATE POLICY "equipment_types_select" ON equipment_types FOR SELECT TO authenticated 
  USING (true);
-- Admin can manage equipment types
CREATE POLICY "equipment_types_insert" ON equipment_types FOR INSERT TO authenticated 
  WITH CHECK (is_admin());
CREATE POLICY "equipment_types_update" ON equipment_types FOR UPDATE TO authenticated 
  USING (is_admin());
CREATE POLICY "equipment_types_delete" ON equipment_types FOR DELETE TO authenticated 
  USING (is_admin());

-- EQUIPMENT
-- All authenticated users can view equipment (public catalog data)
CREATE POLICY "equipment_select" ON equipment FOR SELECT TO authenticated 
  USING (true);
-- Admin can create equipment
CREATE POLICY "equipment_insert" ON equipment FOR INSERT TO authenticated 
  WITH CHECK (is_admin());
-- Admin can update equipment (is_archived restriction enforced at application level)
CREATE POLICY "equipment_update" ON equipment FOR UPDATE TO authenticated 
  USING (is_admin());

-- RESERVATIONS
-- All enabled users can view all reservations
CREATE POLICY "reservations_select" ON reservations FOR SELECT TO authenticated 
  USING (is_enabled());
-- Users can create own reservations, admin can create for anyone
CREATE POLICY "reservations_insert" ON reservations FOR INSERT TO authenticated 
  WITH CHECK (is_enabled() AND ((select auth.uid()) = user_id OR is_admin()));
-- Users can update own PENDING reservations only, admin can update any
CREATE POLICY "reservations_update" ON reservations FOR UPDATE TO authenticated 
  USING (is_enabled() AND (
    is_admin() OR 
    ((select auth.uid()) = user_id AND status = 'PENDING')
  ));
-- Only admin can delete reservations
CREATE POLICY "reservations_delete" ON reservations FOR DELETE TO authenticated 
  USING (is_admin());

-- CREDIT_HISTORY
-- Users can view own credit history, admin can view all
CREATE POLICY "credit_history_select" ON credit_history FOR SELECT TO authenticated 
  USING (is_enabled() AND ((select auth.uid()) = user_id OR is_admin()));
-- Only superAdmin can directly insert credit history
-- Note: RPC functions bypass RLS with SECURITY DEFINER for reservation-related credits
CREATE POLICY "credit_history_insert" ON credit_history FOR INSERT TO authenticated 
  WITH CHECK (is_super_admin());

-- CREDIT_REQUESTS
-- Users can view own credit requests, admin can view all
CREATE POLICY "credit_requests_select" ON credit_requests FOR SELECT TO authenticated 
  USING (is_enabled() AND ((select auth.uid()) = user_id OR is_admin()));
-- Users can create their own credit requests
CREATE POLICY "credit_requests_insert" ON credit_requests FOR INSERT TO authenticated 
  WITH CHECK (is_enabled() AND (select auth.uid()) = user_id);
-- Only superAdmin can approve/deny credit requests
CREATE POLICY "credit_requests_update" ON credit_requests FOR UPDATE TO authenticated 
  USING (is_super_admin());

-- MAINTENANCE_LOGS
-- All enabled users can view maintenance logs
CREATE POLICY "maintenance_logs_select" ON maintenance_logs FOR SELECT TO authenticated 
  USING (is_enabled());
-- All enabled users can create maintenance logs
CREATE POLICY "maintenance_logs_insert" ON maintenance_logs FOR INSERT TO authenticated 
  WITH CHECK (is_enabled());
-- Only admin can update maintenance logs
CREATE POLICY "maintenance_logs_update" ON maintenance_logs FOR UPDATE TO authenticated 
  USING (is_admin());
-- Only admin can delete maintenance logs
CREATE POLICY "maintenance_logs_delete" ON maintenance_logs FOR DELETE TO authenticated 
  USING (is_admin());

-- RESERVATION_HISTORY
-- All enabled users can view all reservation history
CREATE POLICY "reservation_history_select" ON reservation_history FOR SELECT TO authenticated 
  USING (is_enabled());
-- Admin can insert reservation history (typically done via triggers)
CREATE POLICY "reservation_history_insert" ON reservation_history FOR INSERT TO authenticated 
  WITH CHECK (is_admin());
