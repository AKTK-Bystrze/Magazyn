-- Migration: Logic and RLS
-- Description: Functions, Trigger Functions, Triggers, and RLS Policies

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $body$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'));
$body$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role LANGUAGE plpgsql SECURITY DEFINER STABLE AS $body$
DECLARE user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value FROM public.profiles WHERE id = auth.uid();
  RETURN user_role_value;
END; $body$;

-- POLICIES
CREATE POLICY "Users can view own profile or admins see all" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Public can view equipment types" ON equipment_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage equipment types" ON equipment_types FOR ALL USING (is_admin());
CREATE POLICY "All authenticated users can view equipment" ON equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage equipment" ON equipment FOR ALL USING (is_admin());
CREATE POLICY "Authenticated users can view all reservations" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own or admins insert any" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users modify pending or admins modify all" ON reservations FOR UPDATE USING ((auth.uid() = user_id AND status = 'PENDING') OR is_admin());
CREATE POLICY "Admins can delete reservations" ON reservations FOR DELETE USING (is_admin());
CREATE POLICY "Users can view own credit history or admins see all" ON credit_history FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can insert credit history" ON credit_history FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Users can view own or admins see all" ON credit_requests FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can create credit requests" ON credit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SuperAdmins can update credit requests" ON credit_requests FOR UPDATE USING (get_user_role() = 'super_admin');
CREATE POLICY "Admins can view and create maintenance logs" ON maintenance_logs FOR ALL USING (is_admin());
CREATE POLICY "Users can view own history or admins see all" ON reservation_history FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Admins can insert reservation history" ON reservation_history FOR INSERT WITH CHECK (is_admin());

-- TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $body$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $body$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_user_role_metadata() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'role' IS NULL THEN NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || '{"role": "user"}'::jsonb; END IF; RETURN NEW; END; $body$;

CREATE OR REPLACE FUNCTION public.create_user_profile() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
BEGIN INSERT INTO public.profiles (id, email, username, role, is_enabled) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 'user', false); RETURN NEW; END; $body$;

CREATE OR REPLACE FUNCTION log_maintenance_change() RETURNS TRIGGER AS $body$
BEGIN IF OLD.status IS DISTINCT FROM NEW.status THEN INSERT INTO maintenance_logs (equipment_id, previous_status, new_status, admin_id) VALUES (NEW.id, OLD.status, NEW.status, auth.uid()); END IF; RETURN NEW; END; $body$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_reservation_change() RETURNS TRIGGER AS $body$
DECLARE v_changed_by UUID;
BEGIN v_changed_by := NULLIF(current_setting('app.changed_by_user_id', true), '')::UUID; IF v_changed_by IS NULL THEN v_changed_by := auth.uid(); END IF;
  INSERT INTO reservation_history (reservation_id, user_id, equipment_id, start_date, end_date, status, changed_by_user_id)
  VALUES (NEW.id, NEW.user_id, NEW.equipment_id, NEW.start_date, NEW.end_date, NEW.status, v_changed_by);
  RETURN NEW;
END; $body$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGERS
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER update_credit_requests_updated_at BEFORE UPDATE ON credit_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_user_role_metadata_trigger BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.set_user_role_metadata();
CREATE TRIGGER create_user_profile_trigger AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.create_user_profile();
CREATE TRIGGER log_equipment_status_change AFTER UPDATE ON equipment FOR EACH ROW EXECUTE PROCEDURE log_maintenance_change();
CREATE TRIGGER log_reservation_changes AFTER INSERT OR UPDATE ON reservations FOR EACH ROW EXECUTE PROCEDURE log_reservation_change();
