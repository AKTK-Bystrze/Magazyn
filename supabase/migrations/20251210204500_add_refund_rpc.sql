-- Migration to add refund_reservation_credits RPC function
-- Description: Adds credits back to a user's profile and logs the transaction.

CREATE OR REPLACE FUNCTION refund_reservation_credits(p_reservation_id uuid, p_amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id from the reservation
  SELECT user_id INTO v_user_id FROM reservations WHERE id = p_reservation_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- Update user balance
  UPDATE profiles
  SET credit_balance = credit_balance + p_amount
  WHERE id = v_user_id;

  -- Log credit history
  INSERT INTO credit_history (user_id, amount, reason, reservation_id)
  VALUES (v_user_id, p_amount, 'reservation_refund', p_reservation_id);

END;
$$;
