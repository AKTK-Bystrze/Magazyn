CREATE OR REPLACE FUNCTION refund_reservation_credits(p_reservation_id UUID, p_amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM reservations WHERE id = p_reservation_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  UPDATE profiles
  SET credit_balance = credit_balance + p_amount
  WHERE id = v_user_id;

  INSERT INTO credit_history (user_id, amount, reason, reservation_id, author_id)
  VALUES (v_user_id, p_amount, 'reservation_refund', p_reservation_id, v_user_id);
END;
$$;
