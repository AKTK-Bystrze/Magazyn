DROP TABLE IF EXISTS credit_requests CASCADE;
DROP TYPE IF EXISTS credit_request_status CASCADE; -- Wait, the new plan doesn't specify an enum for status, just a VARCHAR check, but I can use a type or just drop the old type. Actually, plan uses VARCHAR(50). Let's drop old type just in case, but it's used in 20251120194634_base.sql. Let's just drop the table.

CREATE TABLE credit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    credits_value INT NOT NULL CHECK (credits_value > 0),
    requestor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_helped_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'awaiting' 
           CHECK (status IN ('awaiting', 'approved', 'rejected', 'approved with changes')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE credit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_requests_select" ON credit_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "credit_requests_insert" ON credit_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "credit_requests_update" ON credit_requests FOR UPDATE TO authenticated USING (true);

-- Mapping table for "Users who helped" (Many-to-Many)
CREATE TABLE credit_request_helpers (
    credit_request_id UUID REFERENCES credit_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    PRIMARY KEY (credit_request_id, user_id)
);

ALTER TABLE credit_request_helpers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_request_helpers_select" ON credit_request_helpers FOR SELECT TO authenticated USING (true);
CREATE POLICY "credit_request_helpers_insert" ON credit_request_helpers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "credit_request_helpers_update" ON credit_request_helpers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "credit_request_helpers_delete" ON credit_request_helpers FOR DELETE TO authenticated USING (true);
