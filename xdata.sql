-- postgres runs files in alphabetical order. x in "xdata.sql" makes it run after "schema.sql"
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
( 'kursant2', 'user', 'kursant2@bystrzeEmail.pl', 900, TRUE),
( 'kursant1', 'user', 'kursant1@bystrzeEmail.com', 900, TRUE),
( 'admin1', 'admin', 'admin1@bystrzeEmail.com', 900, TRUE),
( 'admin2', 'admin ninja', 'admin2@bystrzeEmail.com', 900, TRUE),
( 'ninja', 'ninja', 'ninja@bystrzeEmail.com', 900, FALSE),
( 'superAdmin', 'superAdmin admin ninja', 'superAdmin@bystrzeEmail.com', 900, TRUE);