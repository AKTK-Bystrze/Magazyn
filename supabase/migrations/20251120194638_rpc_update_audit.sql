CREATE OR REPLACE FUNCTION update_reservation_with_audit(p_reservation_id UUID, p_changed_by_user_id UUID, p_status TEXT DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $body$
DECLARE v_updated_reservation reservations%ROWTYPE;
BEGIN
    PERFORM set_config('app.changed_by_user_id', p_changed_by_user_id::TEXT, true);
    UPDATE reservations SET status = COALESCE(p_status::reservation_status, status), start_date = COALESCE(p_start_date, start_date), end_date = COALESCE(p_end_date, end_date), updated_at = NOW() WHERE id = p_reservation_id RETURNING * INTO v_updated_reservation;
    IF v_updated_reservation.id IS NULL THEN RAISE EXCEPTION 'Reservation not found'; END IF;
    RETURN jsonb_build_object('id', v_updated_reservation.id, 'status', v_updated_reservation.status);
END; $body$;
