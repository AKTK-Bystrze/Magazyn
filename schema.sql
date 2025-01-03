-- 0 in name file is needed to make sure schema runs before data
-- Drop tables if they exist
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS reservation_audit CASCADE;

-- Create 'users' table
CREATE TABLE IF NOT EXISTS users (
    u_id SERIAL PRIMARY KEY,
    u_username TEXT NOT NULL UNIQUE,
    u_password_hash TEXT,
    u_email TEXT NOT NULL UNIQUE,
    u_role TEXT NOT NULL DEFAULT 'user',
    u_credits INTEGER,
    u_enabled BOOLEAN DEFAULT FALSE
);

-- Create 'items' table
CREATE TABLE IF NOT EXISTS items (
    i_id SERIAL PRIMARY KEY,
    i_name TEXT NOT NULL,
    i_description TEXT,
    i_status TEXT CHECK (i_status IN ('ok', 'broken', 'hidden')) NOT NULL DEFAULT 'ok',
    i_type TEXT CHECK (i_type IN ('kayak', 'paddle', 'life_jacket', 'helmet', 'rope', 'wetsuit', 'jacket', 'spray_skirt')) NOT NULL
);

-- Create 'reservations' table
CREATE TABLE IF NOT EXISTS reservations (
    r_id SERIAL PRIMARY KEY,
    r_item_id INTEGER NOT NULL,
    r_user_id INTEGER NOT NULL,
    r_start_time TIMESTAMPTZ NOT NULL,
    r_end_time TIMESTAMPTZ CHECK (r_end_time >= r_start_time) NOT NULL,
    r_status TEXT CHECK (r_status IN ('pending', 'approved', 'rented', 'returned', 'denied')) NOT NULL DEFAULT 'pending',
    r_created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    r_changeby_uid INTEGER NOT NULL,
    FOREIGN KEY (r_item_id) REFERENCES items (i_id),
    FOREIGN KEY (r_user_id) REFERENCES users (u_id)
);

-- Create 'reservation_audit' table
CREATE TABLE reservation_audit (
    ra_id SERIAL PRIMARY KEY,
    ra_reservation_id INTEGER NOT NULL,
    ra_user_id INTEGER NOT NULL,
    ra_status TEXT CHECK (ra_status IN ('pending', 'approved', 'rented', 'returned', 'denied')) NOT NULL,
    ra_change_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ra_reservation_id) REFERENCES reservations(r_id),
    FOREIGN KEY(ra_user_id) REFERENCES users(u_id)
);

CREATE TABLE credit_audit (
    ca_id SERIAL PRIMARY KEY,
    ca_user_id INT NOT NULL,
    ca_author_id INT NOT NULL,
    ca_value INT NOT NULL,
    ca_balance INT NOT NULL,
    ca_description TEXT NOT NULL,
    ca_change_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ca_user_id) REFERENCES users(u_id),
    FOREIGN KEY(ca_author_id) REFERENCES users(u_id)
);

-- Create trigger to log reservation insert
CREATE OR REPLACE FUNCTION log_reservation_insert_fn() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO reservation_audit (ra_reservation_id, ra_user_id, ra_status)
    VALUES (NEW.r_id, NEW.r_changeby_uid, NEW.r_status);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_reservation_insert
AFTER INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION log_reservation_insert_fn();

-- Create trigger to log reservation changes (status update)
CREATE OR REPLACE FUNCTION log_reservation_change_fn() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.r_status <> NEW.r_status THEN
        INSERT INTO reservation_audit (ra_reservation_id, ra_user_id, ra_status)
        VALUES (NEW.r_id, NEW.r_changeby_uid, NEW.r_status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_reservation_change
AFTER UPDATE ON reservations
FOR EACH ROW
WHEN (OLD.r_status IS DISTINCT FROM NEW.r_status)
EXECUTE FUNCTION log_reservation_change_fn();