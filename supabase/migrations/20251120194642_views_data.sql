-- Migration: Views and Sample Data
-- Description: Analytical views, Realtime configuration, and Sample Data

-- VIEWS
CREATE OR REPLACE VIEW analytics_equipment_stats AS SELECT e.id AS equipment_id, e.name AS equipment_name, COUNT(r.id) AS total_reservations, COALESCE(SUM(r.end_date - r.start_date), 0) AS total_days_rented, CASE WHEN COUNT(r.id) > 0 THEN (CAST(SUM(r.end_date - r.start_date) AS float) / GREATEST(1, (CURRENT_DATE - DATE(e.created_at)))) ELSE 0 END AS utilization_rate FROM equipment e LEFT JOIN reservations r ON e.id = r.equipment_id AND r.status = 'RETURNED' GROUP BY e.id, e.name;
CREATE OR REPLACE VIEW analytics_user_stats AS SELECT p.id AS user_id, p.username, COUNT(r.id) AS total_reservations, COALESCE(SUM(CASE WHEN ch.amount < 0 THEN ABS(ch.amount) ELSE 0 END), 0) AS total_credits_spent, MAX(r.created_at) AS last_reservation_date FROM profiles p LEFT JOIN reservations r ON p.id = r.user_id LEFT JOIN credit_history ch ON p.id = ch.user_id GROUP BY p.id, p.username;

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;

-- SAMPLE DATA
INSERT INTO equipment_types (name, credit_cost_per_day) VALUES ('kayak', 4), ('paddle', 2) ON CONFLICT (name) DO NOTHING;
WITH kayak_type AS (SELECT id FROM equipment_types WHERE name = 'kayak'), paddle_type AS (SELECT id FROM equipment_types WHERE name = 'paddle')
INSERT INTO equipment (internal_id, type_id, name, description, status) VALUES
  ('B102', (SELECT id FROM kayak_type), 'Perception MrClean', 'Playboat - pomarańczowy', 'ok'),
  ('B18', (SELECT id FROM kayak_type), 'Blisstick MiniMistick', 'Creek - żółty', 'ok'),
  ('B21', (SELECT id FROM kayak_type), 'Necky Witch', 'Playboat - żółto-szary', 'ok'),
  ('B3', (SELECT id FROM kayak_type), 'Jackson All Star', 'Freestyle - czerwony', 'ok'),
  ('B1', (SELECT id FROM kayak_type), 'Outlaw Riverrunner', 'żółto-pomarańczowy', 'broken'),
  ('W11', (SELECT id FROM paddle_type), 'DrKajak żółte', 'symetryczne', 'ok'),
  ('W15', (SELECT id FROM paddle_type), 'DrKajak Czerwone', 'symetryczne', 'ok'),
  ('W13', (SELECT id FROM paddle_type), 'DrKajak żółte', 'niesymetryczne', 'broken'),
  ('NW113', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW114', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW115', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW116', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW117', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW118', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW119', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok')
ON CONFLICT (type_id, internal_id) DO NOTHING;

DO $body$ DECLARE super_admin_id uuid; BEGIN SELECT id INTO super_admin_id FROM auth.users WHERE email = 'appbystrze@gmail.com'; IF super_admin_id IS NOT NULL THEN UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb WHERE id = super_admin_id; UPDATE profiles SET role = 'super_admin', credit_balance = 1000, is_enabled = true WHERE id = super_admin_id; END IF; END $body$;
