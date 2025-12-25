/**
 * Reservation UI strings (Polish)
 *
 * UI text strings for reservation views, dialogs, and interactions.
 *
 * @module lib/config/constants/reservation/ui-strings
 */

import { CORE_UI_STRINGS } from "../ui-core";

// =============================================================================
// RESERVATION STATUS VIEW
// =============================================================================

/**
 * UI text strings for reservation status view
 */
export const RESERVATION_STATUS_VIEW_UI_STRINGS = {
  // Page title
  RESERVATION_DETAILS: "Szczegóły Rezerwacji",
  BACK_TO_LIST: "Powrót do Rezerwacji",

  // Section headers
  RESERVATION_INFO: "Informacje o Rezerwacji",
  AUDIT_HISTORY: "Historia Zmian",

  // Info labels
  EQUIPMENT: "Sprzęt",
  DATES: "Daty",
  CREDIT_COST: "Koszt w Godzinkach",
  USER: "Użytkownik",
  CREATED_AT: "Utworzono",

  // Action buttons
  CANCEL_RESERVATION: "Anuluj Rezerwację",
  MARK_RETURNED: "Oznacz jako Zwrócone",
  CHANGE_STATUS: "Zmień Status",

  // Confirmation messages
  CONFIRM_CANCEL_TITLE: "Anulować Rezerwację?",
  CONFIRM_CANCEL_MESSAGE:
    "Ta akcja nie może być cofnięta. Sprzęt stanie się dostępny dla innych.",
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

  // Success messages
  STATUS_CHANGED_SUCCESS: "Status rezerwacji został pomyślnie zmieniony",
  CANCELLED_SUCCESS: "Rezerwacja anulowana. Godzinki zostały zwrócone.",
  MARKED_RETURNED_SUCCESS: "Rezerwacja oznaczona jako zwrócona",

  // Error messages
  UNAUTHORIZED: "Nie masz uprawnień do przeglądania tej rezerwacji",
  NOT_FOUND: "Nie znaleziono rezerwacji",
  CONFLICT: "Status rezerwacji został już zmieniony",
  NETWORK_ERROR: "Błąd połączenia. Spróbuj ponownie",
  STATUS_CHANGE_FAILED: "Nie udało się zmienić statusu rezerwacji",

  // Loading states (reuse from core)
  LOADING: CORE_UI_STRINGS.LOADING,
  UPDATING: "Aktualizowanie...",

  // Audit timeline
  CHANGED_BY: "Zmienione przez",
  INITIAL_CREATION: "Rezerwacja utworzona",
  SYSTEM: "System",
} as const;

// =============================================================================
// RESERVATION DATE MODIFICATION
// =============================================================================

/**
 * UI text strings for date modification dialogs
 */
export const RESERVATION_DATE_MODIFICATION_UI_STRINGS = {
  // Modify Dates Dialog
  MODIFY_DATES_TITLE: "Zmień Daty Rezerwacji",
  MODIFY_DATES_DESCRIPTION:
    "Zmień daty rozpoczęcia i zakończenia tej rezerwacji. Godzinki zostaną dostosowane na podstawie nowego okresu.",
  MODIFY_DATES_BUTTON: "Zmień Daty",
  CONFIRM_CHANGES: "Potwierdź Zmiany",
  CANCEL_CHANGES: "Anuluj",

  // Return with Dates Dialog
  RETURN_WITH_DATES_TITLE: "Oznacz jako Zwrócone",
  RETURN_WITH_DATES_DESCRIPTION:
    "Oznacz tę rezerwację jako zwróconą. Możesz opcjonalnie zmodyfikować daty przed zwrotem.",
  MODIFY_DATES_BEFORE_RETURN: "Zmodyfikuj daty przed zwrotem",
  MODIFY_DATES_CHECKBOX_HINT:
    "Zaznacz, jeśli sprzęt został zwrócony wcześniej lub później niż planowano",
  CONFIRM_RETURN: "Potwierdź Zwrot",
  FINAL_STATUS_WARNING:
    "⚠️ ZWRÓCONE to status końcowy i nie może być później zmieniony.",

  // Credit Adjustment
  CREDIT_ADJUSTMENT_TITLE: "Korekta Godzinek",
  DATE_COMPARISON: "Porównanie Dat",
  ORIGINAL_DATES: "Oryginalne",
  NEW_DATES: "Nowe",
  CREDIT_ADJUSTMENT: "Korekta Godzinek",
  CURRENT_BALANCE: "Aktualne Saldo",
  NEW_BALANCE: "Nowe Saldo",

  // Warnings
  SIGNIFICANT_EXTENSION_WARNING: "Wykryto Znaczące Wydłużenie",
  INSUFFICIENT_CREDITS_WARNING:
    "Niewystarczająca liczba godzinek. Potrzebujesz {amount} więcej godzinek, aby dokończyć tę modyfikację.",

  // Validation Errors
  START_DATE_REQUIRED: "Data rozpoczęcia jest wymagana",
  END_DATE_REQUIRED: "Data zakończenia jest wymagana",
  START_DATE_MUST_BE_FUTURE: "Data rozpoczęcia musi być w przyszłości",
  END_DATE_MUST_BE_AFTER_START:
    "Data zakończenia musi być równa lub późniejsza niż data rozpoczęcia",
  EQUIPMENT_NOT_AVAILABLE: "Sprzęt niedostępny dla wybranych dat",
  DATES_MUST_CHANGE: "Wybierz inne daty, aby zmodyfikować rezerwację",

  // Success Messages
  DATES_MODIFIED_SUCCESS: "Daty rezerwacji zostały pomyślnie zmodyfikowane",
  RETURNED_WITH_DATES_SUCCESS:
    "Rezerwacja oznaczona jako zwrócona i daty zaktualizowane",
  RETURNED_SUCCESS: "Rezerwacja oznaczona jako zwrócona",

  // Loading States
  VALIDATING_DATES: "Walidacja dat...",
  UPDATING_RESERVATION: "Aktualizowanie rezerwacji...",
} as const;
