-- Migration: Add atomic reservation transaction RPC
-- Description: Adds a function to handle credit deduction and reservation creation atomically.

CREATE OR REPLACE FUNCTION create_reservation_atomic(
    p_user_id UUID,
    p_total_cost INTEGER,
    p_reservations JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_balance INTEGER;
    v_new_balance INTEGER;
    v_reservation RECORD;
    v_created_ids UUID[] := '{}';
    v_conflict_count INTEGER;
    v_res_item JSONB;
    v_reservation_id UUID;
    v_equipment_id UUID;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- 1. Check User Balance & Lock Row
    SELECT credit_balance INTO v_user_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_user_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_user_balance < p_total_cost THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    -- 2. Deduct Credits
    v_new_balance := v_user_balance - p_total_cost;
    
    UPDATE profiles
    SET credit_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- 3. Log Credit History (One entry for the bulk operation or per item? Let's do bulk for now)
    INSERT INTO credit_history (user_id, amount, reason, description)
    VALUES (p_user_id, -p_total_cost, 'RESERVATION', 'Credit deduction for equipment reservation');

    -- 4. Process Reservations
    FOR v_res_item IN SELECT * FROM jsonb_array_elements(p_reservations)
    LOOP
        v_equipment_id := (v_res_item->>'equipment_id')::UUID;
        v_start_date := (v_res_item->>'start_date')::DATE;
        v_end_date := (v_res_item->>'end_date')::DATE;

        -- Double Check Conflicts (Concurrency safety)
        SELECT COUNT(*) INTO v_conflict_count
        FROM reservations
        WHERE equipment_id = v_equipment_id
          AND status IN ('PENDING', 'RENTED')
          AND start_date <= v_end_date
          AND end_date >= v_start_date;

        IF v_conflict_count > 0 THEN
            RAISE EXCEPTION 'Conflict detected for equipment %', v_equipment_id;
        END IF;

        -- Insert Reservation
        INSERT INTO reservations (user_id, equipment_id, start_date, end_date, status)
        VALUES (p_user_id, v_equipment_id, v_start_date, v_end_date, 'PENDING')
        RETURNING id INTO v_reservation_id;

        -- Add to result list
        v_created_ids := array_append(v_created_ids, v_reservation_id);
    END LOOP;

    -- Return created IDs (and maybe updated balance?)
    RETURN jsonb_build_object(
        'reservation_ids', v_created_ids,
        'new_balance', v_new_balance
    );
END;
$$;
