-- Migration: Add date modification with credit adjustment
-- Description: Adds RPC function to modify reservation dates with automatic credit adjustment

CREATE OR REPLACE FUNCTION modify_reservation_dates_with_credits(
    p_reservation_id UUID,
    p_changed_by_user_id UUID,
    p_new_start_date DATE,
    p_new_end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
BEGIN
    -- Set session variable for changed_by_user_id (used by trigger)
    PERFORM set_config('app.changed_by_user_id', p_changed_by_user_id::TEXT, true);

    -- 1. Get current reservation details and lock it
    SELECT * INTO v_reservation
    FROM reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF v_reservation.id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found: %', p_reservation_id;
    END IF;

    v_user_id := v_reservation.user_id;
    v_equipment_id := v_reservation.equipment_id;
    v_old_start_date := v_reservation.start_date;
    v_old_end_date := v_reservation.end_date;

    -- 2. Calculate costs
    -- Get equipment type to determine daily cost
    SELECT type_id INTO v_equipment_type_id
    FROM equipment
    WHERE id = v_equipment_id;

    SELECT credit_cost_per_day INTO v_credit_per_day
    FROM equipment_types
    WHERE id = v_equipment_type_id;

    -- Calculate days (inclusive)
    v_old_days := (v_old_end_date - v_old_start_date) + 1;
    v_new_days := (p_new_end_date - p_new_start_date) + 1;

    v_old_cost := v_old_days * v_credit_per_day;
    v_new_cost := v_new_days * v_credit_per_day;
    v_credit_adjustment := v_old_cost - v_new_cost; -- positive = refund, negative = charge

    -- 3. Get user's current balance and lock their profile
    SELECT credit_balance INTO v_user_balance
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_user_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', v_user_id;
    END IF;

    -- 4. Check if user has sufficient credits for extension (if adjustment is negative)
    v_new_balance := v_user_balance + v_credit_adjustment;
    
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', ABS(v_credit_adjustment), v_user_balance;
    END IF;

    -- 5. Update user's credit balance
    UPDATE profiles
    SET credit_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- 6. Log credit history (only if there's an adjustment)
    IF v_credit_adjustment != 0 THEN
        INSERT INTO credit_history (user_id, amount, reason, description, reservation_id)
        VALUES (
            v_user_id,
            v_credit_adjustment,
            'reservation_adjustment',
            CASE 
                WHEN v_credit_adjustment > 0 THEN 
                    FORMAT('Refund for shortening reservation (%s days to %s days)', v_old_days, v_new_days)
                ELSE 
                    FORMAT('Charge for extending reservation (%s days to %s days)', v_old_days, v_new_days)
            END,
            p_reservation_id
        );
    END IF;

    -- 7. Update reservation dates
    UPDATE reservations
    SET start_date = p_new_start_date,
        end_date = p_new_end_date,
        updated_at = NOW()
    WHERE id = p_reservation_id
    RETURNING * INTO v_reservation;

    -- 8. Return updated reservation info with credit adjustment
    RETURN jsonb_build_object(
        'id', v_reservation.id,
        'start_date', v_reservation.start_date,
        'end_date', v_reservation.end_date,
        'status', v_reservation.status,
        'updated_at', v_reservation.updated_at,
        'old_cost', v_old_cost,
        'new_cost', v_new_cost,
        'credit_adjustment', v_credit_adjustment,
        'new_balance', v_new_balance
    );
END;
$$;

COMMENT ON FUNCTION modify_reservation_dates_with_credits IS 
'Modifies reservation dates and automatically adjusts user credits. 
Charges for extensions, refunds for shortenings. 
Ensures atomic transaction with proper credit validation.';
