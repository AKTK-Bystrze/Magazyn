ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE credit_request_status RENAME VALUE 'PENDING' TO 'awaiting';
ALTER TYPE credit_request_status RENAME VALUE 'APPROVED' TO 'approved';
ALTER TYPE credit_request_status RENAME VALUE 'DENIED' TO 'rejected';
ALTER TYPE credit_request_status ADD VALUE IF NOT EXISTS 'approved with changes';
