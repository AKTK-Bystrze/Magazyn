-- Drop tables if they exist
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS reservation_audit CASCADE;
DROP TABLE IF EXISTS big_news CASCADE;
DROP TABLE IF EXISTS small_news CASCADE;

-- Create 'users' table
CREATE TABLE IF NOT EXISTS users (
    u_id SERIAL PRIMARY KEY,
    u_username TEXT NOT NULL UNIQUE,
    u_password_hash TEXT,
    u_email TEXT NOT NULL UNIQUE,
    u_role TEXT NOT NULL DEFAULT 'user',
    u_credits INTEGER
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

-- Insert into items table
INSERT INTO items (i_name, i_description, i_status, i_type) VALUES
('B102', 'Perception MrClean Playboat - pomaranczowy', 'ok', 'kayak'),
('B18', 'Blisstick MiniMistick Creek - zolty', 'ok', 'kayak'),
('B21', 'Necky Witch Playboat - zolto-szary', 'ok', 'kayak'),
('B3', 'Jackson All Star Freestyle - czerwony', 'ok', 'kayak'),
('B1', 'Outlaw Riverrunner - zolto-pomaranczowy', 'broken', 'kayak'),
('W11', 'DrKajak żółte symetryczne', 'ok', 'paddle'),
('W15', 'DrKajak Czerwone symetryczne', 'ok', 'paddle'),
('W13', 'DrKajak żółte niesymetryczne', 'broken', 'paddle'),
('NW113', 'Rapa nizinna zielona', 'ok', 'paddle'),
('NW114', 'Rapa nizinna zielona', 'ok', 'paddle'),
('NW115', 'Rapa nizinna zielona', 'ok', 'paddle'),
('NW116', 'Rapa nizinna zielona', 'ok', 'paddle'),
('NW117', 'Rapa nizinna zielona', 'ok', 'paddle'),
('NW118', 'Rapa nizinna zielona', 'ok', 'paddle'),
('NW119', 'Rapa nizinna zielona', 'ok', 'paddle');

-- Insert into users table
INSERT INTO users ( u_username, u_role, u_email, u_credits) VALUES
( 'kursant2', 'user', 'kursant2@bystrzeEmail.pl', 900),
( 'kursant1', 'user', 'kursant1@bystrzeEmail.com', 900),
( 'admin1', 'admin', 'admin1@bystrzeEmail.com', 900),
( 'admin2', 'admin ninja', 'admin2@bystrzeEmail.com', 900),
( 'ninja', 'ninja', 'ninja@bystrzeEmail.com', 900),
( 'superAdmin', 'superAdmin admin ninja', 'superAdmin@bystrzeEmail.com', 900);

-- Insert into reservations table
INSERT INTO reservations ( r_start_time, r_end_time, r_item_id, r_user_id, r_changeby_uid, r_status, r_created_at) VALUES
( '2023-04-01 10:00:00', '2023-04-05 10:00:00', 1, 1, 1, 'pending', '2023-03-02 16:05:00'),
( '2023-04-01 12:00:00', '2023-04-03 18:00:00', 2, 1, 1, 'pending', '2023-03-04 20:13:00'),
( '2023-04-03 16:00:00', '2023-04-05 18:00:00', 3, 1, 1, 'pending', '2023-03-07 21:37:00'),
( '2023-04-04 08:00:00', '2023-04-07 12:00:00', 2, 1, 1, 'pending', '2023-03-08 09:14:00'),
( '2023-04-05 10:00:00', '2023-04-05 18:00:00', 1, 1, 1, 'pending', '2023-03-09 10:23:00'),
( '2023-04-07 10:00:00', '2023-04-09 12:00:00', 1, 1, 1, 'pending', '2023-03-09 21:37:00'),
( '2023-04-08 14:00:00', '2023-04-11 12:00:00', 2, 1, 1, 'pending', '2023-03-12 13:34:00'),
( '2023-04-10 10:00:00', '2023-04-15 18:00:00', 3, 1, 1, 'pending', '2023-03-12 17:15:00'),
( '2023-04-12 08:00:00', '2023-04-14 18:00:00', 1, 1, 1, 'pending', '2023-03-13 06:59:00'),
( '2023-04-13 12:00:00', '2023-04-17 12:00:00', 4, 1, 1, 'pending', '2023-03-13 21:14:00'),
( '2023-01-01 10:00:00', '2023-01-05 10:00:00', 1, 1, 1, 'pending', '2022-12-29 16:05:00'),
( '2023-01-19 12:00:00', '2023-01-23 18:00:00', 2, 1, 1, 'pending', '2023-01-10 20:13:00'),
( '2023-02-23 16:00:00', '2023-02-25 18:00:00', 3, 1, 1, 'pending', '2023-02-07 21:37:00');

-- Update reservations status
UPDATE reservations
SET r_status = 'approved', r_changeby_uid = 2
WHERE r_id IN (0, 1, 2, 4, 5, 7, 8, 9, 10, 11, 12);
