-- Migration: Fix modify_reservation_dates_with_credits to skip credit calculations for free reservations
-- Description: Prevents accidental charging when admins modify dates of free reservations

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
    
    -- For free reservations, just update dates without credit calculations
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
    
    -- Original logic for paid reservations
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