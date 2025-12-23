/**
 * Credit history UI strings (Polish)
 *
 * UI text strings for credit history view.
 *
 * @module lib/config/constants/credit/ui-strings
 */

/**
 * UI text strings for credit history view
 */
export const CREDIT_HISTORY_UI_STRINGS = {
  PAGE_TITLE: "Historia Godzinek",
  PAGE_DESCRIPTION:
    "Przeglądaj transakcje godzinek, w tym opłaty za rezerwacje i godzinki za pracę.",
  CURRENT_BALANCE: "Aktualne Saldo",
  TABLE_DATE: "Data",
  TABLE_REASON: "Powód",
  TABLE_DESCRIPTION: "Opis",
  TABLE_AMOUNT: "Ilość",
  TABLE_AUTHOR: "Przez",
  REASON_RESERVATION_CHARGE: "Opłata za Rezerwację",
  REASON_RESERVATION_REFUND: "Zwrot za Rezerwację",
  REASON_RESERVATION_ADJUSTMENT: "Korekta Rezerwacji",
  REASON_ADMIN_ADJUSTMENT: "Korekta Administratora",
  REASON_WORK_CREDIT: "Godzinki za Pracę",
  NO_HISTORY: "Nie znaleziono transakcji godzinek.",
  ERROR_FETCHING: "Nie udało się załadować historii godzinek.",
} as const;
