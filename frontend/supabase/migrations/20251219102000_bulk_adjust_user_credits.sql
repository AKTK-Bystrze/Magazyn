-- Migration: Bulk Adjust User Credits RPC
-- Description: Adds a stored procedure to atomically adjust credit balances for multiple users and log the history records.
-- Affected Tables: profiles, credit_history

-- Create the bulk adjustment function
create or replace function bulk_adjust_user_credits(
    p_user_ids uuid[],
    p_admin_id uuid,
    p_amount int,
    p_reason text,
    p_description text
) returns void as $$
declare
    v_user_id uuid;
begin
    -- 1. Loop through user IDs to update each profile and insert history
    -- We use a loop for individual updates to ensure we GREATEST(0, ...) for each user correctly
    -- and to create specific history records for each user.
    foreach v_user_id in array p_user_ids loop
        -- Update the user's credit balance (ensure it doesn't go below 0)
        update profiles
        set 
            credit_balance = greatest(0, credit_balance + p_amount),
            updated_at = now()
        where id = v_user_id;

        -- Record the transaction in credit_history
        insert into credit_history (
            user_id,
            admin_id,
            amount,
            reason,
            description
        ) values (
            v_user_id,
            p_admin_id,
            p_amount,
            p_reason,
            p_description
        );
    end loop;
end;
$$ language plpgsql security definer;

-- Add comment explaining the function
comment on function bulk_adjust_user_credits is 'Atomically adjusts credit balances for multiple users and records the history entry for each in a single transaction.';
