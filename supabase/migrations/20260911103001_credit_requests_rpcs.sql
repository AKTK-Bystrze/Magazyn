-- =============================================================================
-- RPC: create_credit_request_atomic
-- Inserts credit_request + helpers in a single transaction.
-- =============================================================================
CREATE OR REPLACE FUNCTION create_credit_request_atomic(
  p_title VARCHAR,
  p_description TEXT,
  p_credits_value INT,
  p_requestor_id UUID,
  p_user_helped_id UUID,
  p_helpers UUID[]
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE
  v_request_id UUID;
  v_helper_id UUID;
BEGIN
  INSERT INTO credit_requests (title, description, credits_value, requestor_id, user_helped_id, status)
  VALUES (p_title, p_description, p_credits_value, p_requestor_id, p_user_helped_id, 'awaiting')
  RETURNING id INTO v_request_id;

  IF p_helpers IS NOT NULL AND array_length(p_helpers, 1) > 0 THEN
    FOREACH v_helper_id IN ARRAY p_helpers LOOP
      INSERT INTO credit_request_helpers (credit_request_id, user_id)
      VALUES (v_request_id, v_helper_id);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', v_request_id);
END; $body$;

-- =============================================================================
-- RPC: update_credit_request_atomic
-- Updates credit_request fields + replaces helpers in a single transaction.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_credit_request_atomic(
  p_id UUID,
  p_title VARCHAR,
  p_description TEXT,
  p_credits_value INT,
  p_user_helped_id UUID,
  p_status VARCHAR,
  p_helpers UUID[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE
  v_helper_id UUID;
BEGIN
  UPDATE credit_requests
  SET title = p_title,
      description = p_description,
      credits_value = p_credits_value,
      user_helped_id = p_user_helped_id,
      status = p_status,
      updated_at = NOW()
  WHERE id = p_id;

  DELETE FROM credit_request_helpers WHERE credit_request_id = p_id;

  IF p_helpers IS NOT NULL AND array_length(p_helpers, 1) > 0 THEN
    FOREACH v_helper_id IN ARRAY p_helpers LOOP
      INSERT INTO credit_request_helpers (credit_request_id, user_id)
      VALUES (p_id, v_helper_id);
    END LOOP;
  END IF;
END; $body$;

-- =============================================================================
-- RPC: review_credit_request_atomic
-- Approves/rejects a request + credits helpers in a single transaction.
-- If anything fails (e.g. invalid reason enum), the entire thing rolls back.
-- =============================================================================
CREATE OR REPLACE FUNCTION review_credit_request_atomic(
  p_id UUID,
  p_admin_id UUID,
  p_status VARCHAR,
  p_credits_value INT DEFAULT NULL,
  p_helpers UUID[] DEFAULT NULL,
  p_reason TEXT DEFAULT 'work_credit',
  p_description TEXT DEFAULT ''
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
DECLARE
  v_existing_value INT;
  v_existing_status VARCHAR;
  v_final_value INT;
  v_final_helpers UUID[];
  v_helper_id UUID;
BEGIN
  -- Lock the row to prevent concurrent reviews
  SELECT credits_value, status INTO v_existing_value, v_existing_status
  FROM credit_requests WHERE id = p_id FOR UPDATE;

  IF v_existing_status IS NULL THEN
    RAISE EXCEPTION 'Credit request not found';
  END IF;

  IF v_existing_status != 'awaiting' THEN
    RAISE EXCEPTION 'Only awaiting requests can be reviewed';
  END IF;

  -- Resolve final values (override or keep existing)
  v_final_value := COALESCE(p_credits_value, v_existing_value);

  IF p_helpers IS NOT NULL THEN
    v_final_helpers := p_helpers;
  ELSE
    SELECT ARRAY_AGG(user_id) INTO v_final_helpers
    FROM credit_request_helpers WHERE credit_request_id = p_id;
  END IF;

  -- Update the request
  UPDATE credit_requests
  SET status = p_status,
      credits_value = v_final_value,
      updated_at = NOW()
  WHERE id = p_id;

  -- Replace helpers if overridden
  IF p_helpers IS NOT NULL THEN
    DELETE FROM credit_request_helpers WHERE credit_request_id = p_id;
    FOREACH v_helper_id IN ARRAY p_helpers LOOP
      INSERT INTO credit_request_helpers (credit_request_id, user_id)
      VALUES (p_id, v_helper_id);
    END LOOP;
  END IF;

  -- Credit helpers if approved
  IF p_status IN ('approved', 'approved with changes') THEN
    IF v_final_helpers IS NOT NULL THEN
      FOREACH v_helper_id IN ARRAY v_final_helpers LOOP
        UPDATE profiles
        SET credit_balance = GREATEST(0, credit_balance + v_final_value),
            updated_at = NOW()
        WHERE id = v_helper_id;

        INSERT INTO credit_history (user_id, author_id, amount, reason, description)
        VALUES (v_helper_id, p_admin_id, v_final_value,
                p_reason::credit_transaction_reason, p_description);
      END LOOP;
    END IF;
  END IF;
END; $body$;

-- =============================================================================
-- RPC: get_credit_leaderboard
-- Server-side aggregation — no row limit, no in-memory sorting.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_credit_leaderboard()
RETURNS TABLE(user_id UUID, username VARCHAR, total_credits BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
  SELECT h.user_id,
         p.username,
         SUM(cr.credits_value)::BIGINT AS total_credits
  FROM credit_request_helpers h
  JOIN credit_requests cr ON cr.id = h.credit_request_id
  JOIN profiles p ON p.id = h.user_id
  WHERE cr.status IN ('approved', 'approved with changes')
  GROUP BY h.user_id, p.username
  ORDER BY total_credits DESC;
$body$;
