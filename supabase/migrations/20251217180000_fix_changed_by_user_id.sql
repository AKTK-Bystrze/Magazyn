-- Migration: Fix changed_by_user_id in reservation history
-- Description: Updates the reservation history logging to properly track the user who made the change.
-- The issue is that when using service role key, auth.uid() returns NULL.

-- Solution: Add a session variable that the backend sets before updates
-- The trigger will read from this variable instead of auth.uid()

-- Drop and recreate the function to use a session variable fallback
CREATE OR REPLACE FUNCTION log_reservation_change()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
BEGIN
  -- Try to get the changed_by_user_id from session variable (set by backend)
  -- Fall back to auth.uid() if not set
  v_changed_by := NULLIF(current_setting('app.changed_by_user_id', true), '')::UUID;
  
  IF v_changed_by IS NULL THEN
    v_changed_by := auth.uid();
  END IF;

  INSERT INTO reservation_history (
    reservation_id,
    user_id,
    equipment_id,
    start_date,
    end_date,
    status,
    changed_by_user_id
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.equipment_id,
    NEW.start_date,
    NEW.end_date,
    NEW.status,
    v_changed_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to update a reservation with proper changed_by tracking
CREATE OR REPLACE FUNCTION update_reservation_with_audit(
    p_reservation_id UUID,
    p_changed_by_user_id UUID,
    p_status TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_reservation reservations%ROWTYPE;
BEGIN
    -- Set session variable for changed_by_user_id (used by trigger)
    PERFORM set_config('app.changed_by_user_id', p_changed_by_user_id::TEXT, true);

    -- Update the reservation (only non-null fields)
    UPDATE reservations
    SET 
        status = COALESCE(p_status::reservation_status, status),
        start_date = COALESCE(p_start_date, start_date),
        end_date = COALESCE(p_end_date, end_date),
        updated_at = NOW()
    WHERE id = p_reservation_id
    RETURNING * INTO v_updated_reservation;

    IF v_updated_reservation.id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found: %', p_reservation_id;
    END IF;

    RETURN jsonb_build_object(
        'id', v_updated_reservation.id,
        'status', v_updated_reservation.status,
        'start_date', v_updated_reservation.start_date,
        'end_date', v_updated_reservation.end_date,
        'updated_at', v_updated_reservation.updated_at
    );
END;
$$;

-- Also update the create_reservation_atomic function to set the session variable
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
    -- Set session variable for changed_by_user_id (used by trigger)
    PERFORM set_config('app.changed_by_user_id', p_user_id::TEXT, true);

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
    VALUES (p_user_id, -p_total_cost, 'reservation_charge', 'Credit deduction for equipment reservation');

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

