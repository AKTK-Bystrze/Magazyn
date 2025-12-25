CREATE OR REPLACE FUNCTION bulk_adjust_user_credits(p_user_ids UUID[], p_admin_id UUID, p_amount INT, p_reason TEXT, p_description TEXT) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE v_user_id UUID;
BEGIN
    FOREACH v_user_id IN ARRAY p_user_ids LOOP
        UPDATE profiles SET credit_balance = GREATEST(0, credit_balance + p_amount), updated_at = NOW() WHERE id = v_user_id;
        INSERT INTO credit_history (user_id, author_id, amount, reason, description) VALUES (v_user_id, p_admin_id, p_amount, p_reason::credit_transaction_reason, p_description);
    END LOOP;
END; $body$;
