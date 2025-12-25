-- Krok 1: PRZYWRÓCENIE SCHEMATU (Tabela reservations)
-- Usuwamy nowe ograniczenie CHECK
ALTER TABLE reservations
    DROP CONSTRAINT reservations_r_status_check;

-- Przywracamy stare ograniczenie CHECK (ze statusem 'approved')
ALTER TABLE reservations
    ADD CONSTRAINT reservations_r_status_check
    CHECK (r_status IN ('pending', 'approved', 'rented', 'returned', 'denied'));

-- Krok 2: PRZYWRÓCENIE SCHEMATU (Tabela reservation_audit)
-- Usuwamy nowe ograniczenie CHECK
ALTER TABLE reservation_audit
    DROP CONSTRAINT reservation_audit_ra_status_check;

-- Przywracamy stare ograniczenie CHECK (ze statusem 'approved')
ALTER TABLE reservation_audit
    ADD CONSTRAINT reservation_audit_ra_status_check
    CHECK (ra_status IN ('pending', 'approved', 'rented', 'returned', 'denied'));

-- Krok 3: Opcjonalna AKTUALIZACJA DANYCH
-- Jeśli chcesz przywrócić status 'pending' do 'approved' (np. dla rezerwacji starszych niż X),
-- można to zrobić tutaj, choć jest to operacja ryzykowna na produkcji.
-- Przykładowo, jeśli 'pending' w starej wersji oznaczało "oczekuje na zatwierdzenie",
-- a teraz "zatwierdzenie jest automatyczne", to zmiana z powrotem na 'approved' może być myląca.
-- Zwykle w rollbacku skupiamy się na przywróceniu schematu.