-- Krok 1: AKTUALIZACJA DANYCH
-- Należy najpierw zaktualizować wszystkie istniejące rezerwacje o statusie 'approved' na 'pending' (lub inny odpowiedni status),
-- aby nie naruszyć nowego ograniczenia CHECK.
UPDATE reservations
SET r_status = 'pending'
WHERE r_status = 'approved';

UPDATE reservation_audit
SET ra_status = 'pending'
WHERE ra_status = 'approved';

-- Krok 2: MODYFIKACJA SCHEMATU (Tabela reservations)
-- Najpierw znajdujemy i usuwamy stare ograniczenie CHECK
ALTER TABLE reservations
    DROP CONSTRAINT reservations_r_status_check;

-- Dodajemy nowe ograniczenie CHECK (bez 'approved')
ALTER TABLE reservations
    ADD CONSTRAINT reservations_r_status_check
    CHECK (r_status IN ('pending', 'rented', 'returned', 'denied'));

-- Krok 3: MODYFIKACJA SCHEMATU (Tabela reservation_audit)
-- Najpierw znajdujemy i usuwamy stare ograniczenie CHECK
ALTER TABLE reservation_audit
    DROP CONSTRAINT reservation_audit_ra_status_check;

-- Dodajemy nowe ograniczenie CHECK (bez 'approved')
ALTER TABLE reservation_audit
    ADD CONSTRAINT reservation_audit_ra_status_check
    CHECK (ra_status IN ('pending', 'rented', 'returned', 'denied'));