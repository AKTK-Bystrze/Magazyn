/**
 * Reservation UI strings (Polish)
 *
 * UI text strings for reservation views, dialogs, and interactions.
 *
 * @module lib/config/constants/reservation/ui-strings
 */

import { CORE_UI_STRINGS } from "../ui-core";

/**
 * UI text strings for reservation status view
 */
export const RESERVATION_STATUS_VIEW_UI_STRINGS = {
  RESERVATION_DETAILS: "Szczegóły Rezerwacji",
  BACK_TO_LIST: "Powrót do Rezerwacji",

  RESERVATION_INFO: "Informacje o Rezerwacji",
  AUDIT_HISTORY: "Historia Zmian",

  EQUIPMENT: "Sprzęt",
  DATES: "Daty",
  CREDIT_COST: "Koszt w Godzinkach",
  USER: "Użytkownik",
  CREATED_AT: "Utworzono",

  CANCEL_RESERVATION: "Anuluj",
  MARK_RETURNED: "Zwróć",

  CONFIRM_CANCEL_TITLE: "Anulować Rezerwację?",
  CONFIRM_CANCEL_MESSAGE: "Ta akcja nie może być cofnięta. Sprzęt stanie się dostępny dla innych.",
  CONFIRM_REFUND_LABEL: "Kwota zwrotu:",
  CONFIRM_CANCEL_BUTTON: "Anuluj Rezerwację",
  KEEP_RESERVATION: "Zachowaj Rezerwację",

  CONFIRM_MARK_RETURNED_TITLE: "Oznacz jako Zwrócone?",
  CONFIRM_MARK_RETURNED_MESSAGE:
    "Potwierdź, że sprzęt został zwrócony i jest z powrotem w inwentarzu.",
  CONFIRM_MARK_RETURNED_BUTTON: "Oznacz jako Zwrócone",

  CONFIRM_STATUS_CHANGE_TITLE: "Zmienić Status Rezerwacji?",
  CONFIRM_STATUS_CHANGE_MESSAGE: "Zmieniasz status z",
  CONFIRM_STATUS_CHANGE_BUTTON: "Zmień Status",
  CANCEL_CHANGE: "Anuluj",

  UNAUTHORIZED: "Nie masz uprawnień do przeglądania tej rezerwacji",
  NOT_FOUND: "Nie znaleziono rezerwacji",
  NETWORK_ERROR: "Błąd połączenia. Spróbuj ponownie",

  LOADING: CORE_UI_STRINGS.LOADING,

  CHANGED_BY: "Zmienione przez",
  INITIAL_CREATION: "Rezerwacja utworzona",
  SYSTEM: "System",
} as const;

/**
 * UI text strings for date modification dialogs
 */
export const RESERVATION_DATE_MODIFICATION_UI_STRINGS = {
  MODIFY_DATES_TITLE: "Zmień Daty Rezerwacji",
  MODIFY_DATES_DESCRIPTION:
    "Zmień daty rozpoczęcia i zakończenia tej rezerwacji. Godzinki zostaną dostosowane na podstawie nowego okresu.",
  MODIFY_DATES_BUTTON: "Zmień termin",
  CONFIRM_CHANGES: "Potwierdź Zmiany",
  CANCEL_CHANGES: "Anuluj",

  RETURN_WITH_DATES_TITLE: "Oznacz jako Zwrócone",
  RETURN_WITH_DATES_DESCRIPTION:
    "Oznacz tę rezerwację jako zwróconą. Możesz opcjonalnie zmodyfikować daty przed zwrotem.",
  MODIFY_DATES_BEFORE_RETURN: "Zmodyfikuj daty przed zwrotem",
  MODIFY_DATES_CHECKBOX_HINT:
    "Zaznacz, jeśli sprzęt został zwrócony wcześniej lub później niż planowano",
  CONFIRM_RETURN: "Potwierdź Zwrot",
  FINAL_STATUS_WARNING: "⚠️ ZWRÓCONE to status końcowy i nie może być później zmieniony.",

  SIGNIFICANT_EXTENSION_WARNING: "Wykryto Znaczące Wydłużenie",
  INSUFFICIENT_CREDITS_WARNING:
    "Niewystarczająca liczba godzinek. Potrzebujesz {amount} więcej godzinek, aby dokończyć tę modyfikację.",

  START_DATE_REQUIRED: "Data rozpoczęcia jest wymagana",
  END_DATE_REQUIRED: "Data zakończenia jest wymagana",
  START_DATE_MUST_BE_FUTURE: "Data rozpoczęcia musi być w przyszłości",
  END_DATE_MUST_BE_AFTER_START:
    "Data zakończenia musi być równa lub późniejsza niż data rozpoczęcia",
  EQUIPMENT_NOT_AVAILABLE: "Sprzęt niedostępny dla wybranych dat",
  DATES_MUST_CHANGE: "Wybierz inne daty, aby zmodyfikować rezerwację",

  UPDATING_RESERVATION: "Aktualizowanie rezerwacji...",
} as const;
