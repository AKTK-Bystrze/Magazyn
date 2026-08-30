-- Migration: Add is_free flag to reservations table
-- Description: Allows admins and superadmins to create free reservations.
--   Also updates all affected RPCs in the same migration so they correctly
--   handle is_free from the moment the column exists.

-- 1. Add is_free flag to reservations table
ALTER TABLE reservations
ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT false;

-- 2. Update create_reservation_atomic to accept and store is_free flag.
--    Skips balance check and charges 0 credits when is_free = true.
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
    v_new_balance := v_user_balance - p_total_cost;
  ELSE
    v_new_balance := v_user_balance;
  END IF;

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

-- 3. Update bulk_update_reservations_status to skip refunds for free reservations.
--    Without this guard an admin denying a free reservation would incorrectly
--    refund credits calculated from the equipment day-rate.
CREATE OR REPLACE FUNCTION bulk_update_reservations_status(p_reservation_ids UUID[], p_status TEXT, p_admin_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE 
    v_res_id UUID; 
    v_reservation reservations%ROWTYPE; 
    v_updated_count INTEGER := 0; 
    v_refund_count INTEGER := 0; 
    v_refund_amount INTEGER; 
    v_credit_per_day INTEGER; 
    v_days INTEGER; 
    v_skipped_ids UUID[] := '{}';
BEGIN
    PERFORM set_config('app.changed_by_user_id', p_admin_id::TEXT, true);
    
    FOREACH v_res_id IN ARRAY p_reservation_ids LOOP
        SELECT * INTO v_reservation FROM reservations WHERE id = v_res_id FOR UPDATE;
        IF v_reservation.id IS NULL THEN 
            v_skipped_ids := array_append(v_skipped_ids, v_res_id); 
            CONTINUE; 
        END IF;

        -- Skip refunds for free reservations
        IF p_status = 'DENIED' AND v_reservation.status != 'DENIED' AND NOT v_reservation.is_free THEN
            SELECT et.credit_cost_per_day INTO v_credit_per_day 
            FROM equipment e 
            JOIN equipment_types et ON e.type_id = et.id 
            WHERE e.id = v_reservation.equipment_id;
            
            v_days := (v_reservation.end_date - v_reservation.start_date) + 1; 
            v_refund_amount := v_days * v_credit_per_day;
            
            IF v_refund_amount > 0 THEN
                UPDATE profiles SET credit_balance = credit_balance + v_refund_amount WHERE id = v_reservation.user_id;
                INSERT INTO credit_history (user_id, amount, reason, description, reservation_id, author_id) 
                VALUES (v_reservation.user_id, v_refund_amount, 'reservation_refund', 'Refund', v_res_id, p_admin_id);
                v_refund_count := v_refund_count + 1;
            END IF;
        END IF;

        UPDATE reservations SET status = p_status::reservation_status, updated_at = NOW() WHERE id = v_res_id;
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object('updated_count', v_updated_count, 'skipped_ids', v_skipped_ids);
END; $body$;

-- 4. Update modify_reservation_dates_with_credits to skip credit calculations
--    for free reservations. Without this an admin changing dates on a free
--    reservation would incorrectly charge or refund credits.
CREATE OR REPLACE FUNCTION modify_reservation_dates_with_credits(
    p_reservation_id UUID,
    p_changed_by_user_id UUID,
    p_new_start_date DATE,
    p_new_end_date DATE
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE
    v_reservation reservations%ROWTYPE;
    v_user_id UUID;
    v_equipment_id UUID;
    v_old_start_date DATE;
    v_old_end_date DATE;
    v_old_days INTEGER;
    v_new_days INTEGER;
    v_credit_per_day INTEGER;
    v_old_cost INTEGER;
    v_new_cost INTEGER;
    v_credit_adjustment INTEGER;
    v_user_balance INTEGER;
    v_new_balance INTEGER;
    v_equipment_type_id UUID;
    v_is_free BOOLEAN;
BEGIN
    PERFORM set_config('app.changed_by_user_id', p_changed_by_user_id::TEXT, true);

    SELECT * INTO v_reservation FROM reservations WHERE id = p_reservation_id FOR UPDATE;
    IF v_reservation.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;

    v_user_id := v_reservation.user_id;
    v_equipment_id := v_reservation.equipment_id;
    v_old_start_date := v_reservation.start_date;
    v_old_end_date := v_reservation.end_date;
    v_is_free := v_reservation.is_free;

    -- For free reservations, just update dates without any credit calculations
    IF v_is_free THEN
        UPDATE reservations
        SET start_date = p_new_start_date, end_date = p_new_end_date, updated_at = NOW()
        WHERE id = p_reservation_id
        RETURNING * INTO v_reservation;

        RETURN jsonb_build_object(
            'id', v_reservation.id::text,
            'start_date', v_reservation.start_date::text,
            'end_date', v_reservation.end_date::text,
            'status', v_reservation.status,
            'updated_at', v_reservation.updated_at::text,
            'is_free', true,
            'old_cost', 0,
            'new_cost', 0,
            'credit_adjustment', 0,
            'skipped_free', true
        );
    END IF;

    -- Paid reservation: calculate and apply credit adjustment
    SELECT type_id INTO v_equipment_type_id FROM equipment WHERE id = v_equipment_id;
    SELECT credit_cost_per_day INTO v_credit_per_day FROM equipment_types WHERE id = v_equipment_type_id;

    v_old_days := (v_old_end_date - v_old_start_date) + 1;
    v_new_days := (p_new_end_date - p_new_start_date) + 1;
    v_old_cost := v_old_days * v_credit_per_day;
    v_new_cost := v_new_days * v_credit_per_day;
    v_credit_adjustment := v_old_cost - v_new_cost;

    SELECT credit_balance INTO v_user_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
    v_new_balance := v_user_balance + v_credit_adjustment;

    IF v_new_balance < 0 THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

    UPDATE profiles SET credit_balance = v_new_balance, updated_at = NOW() WHERE id = v_user_id;

    IF v_credit_adjustment != 0 THEN
        INSERT INTO credit_history (user_id, amount, reason, description, reservation_id, author_id)
        VALUES (v_user_id, v_credit_adjustment, 'reservation_adjustment', 'Adjustment', p_reservation_id, p_changed_by_user_id);
    END IF;

    UPDATE reservations SET start_date = p_new_start_date, end_date = p_new_end_date, updated_at = NOW() WHERE id = p_reservation_id RETURNING * INTO v_reservation;

    RETURN jsonb_build_object(
        'id', v_reservation.id::text,
        'start_date', v_reservation.start_date::text,
        'end_date', v_reservation.end_date::text,
        'status', v_reservation.status,
        'updated_at', v_reservation.updated_at::text,
        'is_free', false,
        'old_cost', v_old_cost,
        'new_cost', v_new_cost,
        'credit_adjustment', v_credit_adjustment,
        'new_balance', v_new_balance
    );
END; $body$;
