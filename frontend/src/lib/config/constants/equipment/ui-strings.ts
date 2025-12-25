/**
 * Equipment UI strings (Polish)
 *
 * UI text strings for equipment filters, manager, and validation.
 *
 * @module lib/config/constants/equipment/ui-strings
 */

import { CORE_UI_STRINGS } from "../ui-core";

// =============================================================================
// EQUIPMENT FILTER UI
// =============================================================================

/**
 * UI text strings for equipment filters
 */
export const EQUIPMENT_FILTER_UI_STRINGS = {
  FILTER_BY_AVAILABILITY: "Filtruj według dostępności",
  SEARCH_PLACEHOLDER: "Szukaj po nazwie...",
  ALL_TYPES: "Wszystkie typy",
  EQUIPMENT_TYPE_LABEL: "Typ sprzętu",
  AVAILABILITY_LABEL: "Dostępność",
  STATUS_ALL: "Wszystko",
  STATUS_AVAILABLE: "Dostępne",
  STATUS_BROKEN: "Zepsute/Niedostępne",
  STATUS_BLOCKED: "Zablokowane",
  RESET_FILTERS: "Resetuj filtry",
  CLEAR_DATES: "Wyczyść",
} as const;

// =============================================================================
// EQUIPMENT VALIDATION
// =============================================================================

/**
 * Validation error messages for equipment forms
 */
export const EQUIPMENT_VALIDATION_MESSAGES = {
  INTERNAL_ID_REQUIRED: "ID wewnętrzne jest wymagane",
  TYPE_ID_REQUIRED: "Typ sprzętu jest wymagany",
  NAME_MAX_LENGTH: "Nazwa może mieć maksymalnie 200 znaków",
  IMAGE_MAX_SIZE: "Obraz musi mieć maksymalnie 2MB",
  IMAGE_INVALID_TYPE: "Dozwolone są tylko obrazy JPEG i PNG",
  CREATE_FAILED: "Nie udało się utworzyć sprzętu",
  UPDATE_FAILED: "Nie udało się zaktualizować sprzętu",
  ARCHIVE_FAILED: "Nie udało się zarchiwizować sprzętu",
  ARCHIVE_HAS_ACTIVE_RESERVATIONS:
    "Nie można zarchiwizować sprzętu z aktywnymi rezerwacjami",
  INTERNAL_ID_EXISTS: "ID wewnętrzne już istnieje dla tego typu",
} as const;

// =============================================================================
// EQUIPMENT MANAGER UI
// =============================================================================

/**
 * UI text strings for equipment manager view
 */
export const EQUIPMENT_MANAGER_UI_STRINGS = {
  // Page title
  PAGE_TITLE: "Zarządzanie Sprzętem",
  PAGE_DESCRIPTION:
    "Zarządzaj inwentarzem sprzętu, dodawaj nowe przedmioty i śledź konserwację.",

  // Actions
  ADD_EQUIPMENT: "Dodaj Sprzęt",
  EDIT_EQUIPMENT: "Edytuj Sprzęt",
  VIEW_DETAILS: "Zobacz Szczegóły",
  ARCHIVE_EQUIPMENT: "Archiwizuj",
  TOGGLE_STATUS: "Przełącz Status",

  // Filters
  SEARCH_PLACEHOLDER: "Szukaj po nazwie lub ID...",
  ALL_TYPES: "Wszystkie typy",
  FILTER_BY_TYPE: "Filtruj według typu",
  FILTER_BY_STATUS: "Filtruj według statusu",
  RESET_FILTERS: "Resetuj",

  // Table headers
  INTERNAL_ID: "ID",
  NAME: "Nazwa",
  TYPE: "Typ",
  STATUS: "Status",
  CREDIT_COST: "Koszt/Dzień",
  CREATED: "Utworzono",
  ACTIONS: "Akcje",

  // Dialogs
  ADD_DIALOG_TITLE: "Dodaj Nowy Sprzęt",
  ADD_DIALOG_DESCRIPTION: "Dodaj nowy element sprzętu do inwentarza.",
  EDIT_DIALOG_TITLE: "Edytuj Sprzęt",
  EDIT_DIALOG_DESCRIPTION: "Zaktualizuj informacje o sprzęcie.",
  ARCHIVE_DIALOG_TITLE: "Zarchiwizować Sprzęt?",
  ARCHIVE_DIALOG_MESSAGE:
    "To ukryje sprzęt z katalogu. Nie będzie można go zarezerwować, ale można go później przywrócić.",
  ARCHIVE_BUTTON: "Archiwizuj Sprzęt",
  CANCEL_BUTTON: CORE_UI_STRINGS.CANCEL,
  SAVE_BUTTON: "Zapisz Zmiany",
  CREATE_BUTTON: "Utwórz Sprzęt",

  // Form fields
  FORM_INTERNAL_ID: "ID Wewnętrzne",
  FORM_INTERNAL_ID_PLACEHOLDER: "np. CAM-001",
  FORM_TYPE: "Typ Sprzętu",
  FORM_TYPE_PLACEHOLDER: "Wybierz typ...",
  FORM_NAME: "Nazwa Wyświetlana",
  FORM_NAME_PLACEHOLDER: "Opcjonalna nazwa wyświetlana",
  FORM_DESCRIPTION: "Opis",
  FORM_DESCRIPTION_PLACEHOLDER: "Opcjonalny opis...",
  FORM_STATUS: "Status",
  FORM_IMAGE: "Obraz",

  // Details sheet
  DETAILS_TITLE: "Szczegóły Sprzętu",
  MAINTENANCE_HISTORY: "Historia Konserwacji",
  RESERVATION_HISTORY: "Historia Rezerwacji",
  ADD_MAINTENANCE_LOG: "Dodaj Notatkę Konserwacji",
  NO_MAINTENANCE_HISTORY: "Brak zapisanej historii konserwacji",
  NO_RESERVATION_HISTORY: "Jeszcze brak rezerwacji",

  // Empty state
  NO_EQUIPMENT: "Nie znaleziono sprzętu",
  NO_EQUIPMENT_HINT: "Spróbuj dostosować filtry lub dodaj nowy sprzęt.",

  // Success messages
  CREATED_SUCCESS: "Sprzęt utworzony pomyślnie",
  UPDATED_SUCCESS: "Sprzęt zaktualizowany pomyślnie",
  ARCHIVED_SUCCESS: "Sprzęt zarchiwizowany pomyślnie",
  STATUS_CHANGED_SUCCESS: "Status sprzętu zmieniony",
  MAINTENANCE_LOG_ADDED: "Notatka konserwacji dodana",

  // Loading states (reuse from core)
  LOADING: CORE_UI_STRINGS.LOADING,
  SAVING: CORE_UI_STRINGS.SAVING,
} as const;
