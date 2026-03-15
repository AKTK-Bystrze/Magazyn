-- Migration: Add is_free flag to reservations table
-- Description: Allows admins and superadmins to create free reservations

-- Add is_free flag to reservations table
ALTER TABLE reservations 
ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT false;

-- Update create_reservation_atomic RPC to accept and store is_free flag
-- This allows creating reservations even when user has negative balance if is_free = true
CREATE OR REPLACE FUNCTION create_reservation_atomic(
  p_user_id UUID, 
  p_total_cost INTEGER, 
  p_is_free BOOLEAN,
  p_created_by_user_id UUID,
  p_reservations JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE 
  v_user_balance INTEGER; 
  v_new_balance INTEGER; 
  v_created_ids UUID[] := '{}'; 
  v_conflict_count INTEGER; 
  v_res_item JSONB; 
  v_reservation_id UUID; 
  v_equipment_id UUID; 
  v_start_date DATE; 
  v_end_date DATE;
BEGIN
  PERFORM set_config('app.changed_by_user_id', p_created_by_user_id::TEXT, true);
  SELECT credit_balance INTO v_user_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_user_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  
  -- Skip balance check for free reservations
  IF NOT p_is_free THEN
    IF v_user_balance < p_total_cost THEN RAISE EXCEPTION 'Insufficient credits'; END IF;
  END IF;
  
  v_new_balance := v_user_balance - p_total_cost;
  UPDATE profiles SET credit_balance = v_new_balance, updated_at = NOW() WHERE id = p_user_id;
  
  INSERT INTO credit_history (user_id, amount, reason, description, author_id) 
  VALUES (p_user_id, CASE WHEN p_is_free THEN 0 ELSE -p_total_cost END, 'reservation_charge', 
          CASE WHEN p_is_free THEN 'Free reservation' ELSE 'For equipment reservation' END, 
          p_created_by_user_id);
  
  FOR v_res_item IN SELECT * FROM jsonb_array_elements(p_reservations) LOOP
    IF NOT (v_res_item ? 'equipment_id' AND v_res_item ? 'start_date' AND v_res_item ? 'end_date') THEN
      RAISE EXCEPTION 'Invalid reservation format: missing required keys';
    END IF;
    v_equipment_id := (v_res_item->>'equipment_id')::UUID;
    v_start_date := (v_res_item->>'start_date')::DATE;
    v_end_date := (v_res_item->>'end_date')::DATE;
    
    SELECT COUNT(*) INTO v_conflict_count 
    FROM reservations 
    WHERE equipment_id = v_equipment_id 
      AND status IN ('PENDING', 'RENTED') 
      AND start_date <= v_end_date 
      AND end_date >= v_start_date;
    
    IF v_conflict_count > 0 THEN RAISE EXCEPTION 'Conflict detected'; END IF;
    
    INSERT INTO reservations (user_id, equipment_id, start_date, end_date, status, is_free) 
    VALUES (p_user_id, v_equipment_id, v_start_date, v_end_date, 'PENDING', p_is_free) 
    RETURNING id INTO v_reservation_id;
    
    v_created_ids := array_append(v_created_ids, v_reservation_id);
  END LOOP;
  
  RETURN jsonb_build_object('reservation_ids', v_created_ids, 'new_balance', v_new_balance);
END; $body$;
