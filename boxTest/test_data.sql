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