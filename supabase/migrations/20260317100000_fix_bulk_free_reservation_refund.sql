-- Migration: Fix bulk update to skip refunds for free reservations
-- Description: Update bulk_update_reservations_status RPC to check is_free flag before processing refunds
-- Prevents incorrect refunds when cancelling free reservations

CREATE OR REPLACE FUNCTION bulk_update_reservations_status(p_reservation_ids UUID[], p_status TEXT, p_admin_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE v_res_id UUID; v_reservation reservations%ROWTYPE; v_updated_count INTEGER := 0; v_refund_count INTEGER := 0; v_refund_amount INTEGER; v_credit_per_day INTEGER; v_days INTEGER; v_skipped_ids UUID[] := '{}';
BEGIN
    PERFORM set_config('app.changed_by_user_id', p_admin_id::TEXT, true);
    FOREACH v_res_id IN ARRAY p_reservation_ids LOOP
        SELECT * INTO v_reservation FROM reservations WHERE id = v_res_id FOR UPDATE;
        IF v_reservation.id IS NULL THEN v_skipped_ids := array_append(v_skipped_ids, v_res_id); CONTINUE; END IF;

        -- Skip refunds for free reservations
        IF p_status = 'DENIED' AND v_reservation.status != 'DENIED' AND NOT v_reservation.is_free THEN
            SELECT et.credit_cost_per_day INTO v_credit_per_day FROM equipment e JOIN equipment_types et ON e.type_id = et.id WHERE e.id = v_reservation.equipment_id;
            v_days := (v_reservation.end_date - v_reservation.start_date) + 1; v_refund_amount := v_days * v_credit_per_day;
            IF v_refund_amount > 0 THEN
                UPDATE profiles SET credit_balance = credit_balance + v_refund_amount WHERE id = v_reservation.user_id;
                INSERT INTO credit_history (user_id, amount, reason, description, reservation_id, author_id) VALUES (v_reservation.user_id, v_refund_amount, 'reservation_refund', 'Refund', v_res_id, p_admin_id);
                v_refund_count := v_refund_count + 1;
            END IF;
        END IF;

        UPDATE reservations SET status = p_status::reservation_status, updated_at = NOW() WHERE id = v_res_id;
        v_updated_count := v_updated_count + 1;
    END LOOP;
    RETURN jsonb_build_object('updated_count', v_updated_count, 'skipped_ids', v_skipped_ids);
END; $body$;
