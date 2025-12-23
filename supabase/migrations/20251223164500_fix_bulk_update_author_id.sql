-- Migration: Fix bulk_update_reservations_status to use author_id instead of admin_id
-- Description: Updates the RPC to use the renamed column author_id in credit_history table
-- This aligns with the column rename from admin_id to author_id in migration 20251219165800

CREATE OR REPLACE FUNCTION bulk_update_reservations_status(
    p_reservation_ids UUID[],
    p_status reservation_status,
    p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_res_id UUID;
    v_count INTEGER := 0;
    v_refund_count INTEGER := 0;
    v_reservation RECORD;
    v_equipment_type_cost INTEGER;
    v_days INTEGER;
    v_refund_amount INTEGER;
BEGIN
    FOR v_res_id IN SELECT unnest(p_reservation_ids)
    LOOP
        -- 1. Get reservation details
        SELECT * INTO v_reservation FROM reservations WHERE id = v_res_id;
        
        IF v_reservation IS NULL THEN
            CONTINUE;
        END IF;

        -- 2. Skip if status is already same
        IF v_reservation.status = p_status THEN
            CONTINUE;
        END IF;

        -- 3. If new status is DENIED, handle refund
        IF p_status = 'DENIED' THEN
            -- Calculate refund amount
            -- Try to find exact charge from history first
            SELECT ABS(amount) INTO v_refund_amount
            FROM credit_history
            WHERE reservation_id = v_res_id AND reason = 'reservation_charge'
            LIMIT 1;

            -- Fallback: calculate based on current price if history not specifically linked
            IF v_refund_amount IS NULL THEN
                SELECT et.credit_cost_per_day INTO v_equipment_type_cost
                FROM equipment e
                JOIN equipment_types et ON e.type_id = et.id
                WHERE e.id = v_reservation.equipment_id;
                
                v_days := (v_reservation.end_date - v_reservation.start_date) + 1;
                v_refund_amount := v_days * v_equipment_type_cost;
            END IF;

            -- Perform refund
            IF v_refund_amount > 0 THEN
                UPDATE profiles
                SET credit_balance = credit_balance + v_refund_amount
                WHERE id = v_reservation.user_id;

                -- FIXED: Use author_id instead of admin_id
                INSERT INTO credit_history (user_id, amount, reason, description, reservation_id, author_id)
                VALUES (v_reservation.user_id, v_refund_amount, 'reservation_refund', 'Refund for cancelled reservation (bulk update)', v_res_id, p_admin_id);
                
                v_refund_count := v_refund_count + 1;
            END IF;
        END IF;

        -- 4. Update status
        UPDATE reservations
        SET status = p_status,
            updated_at = NOW()
        WHERE id = v_res_id;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'updated_count', v_count,
        'refund_count', v_refund_count
    );
END;
$$;
