/**
 * Core UI terminology and shared strings (Polish)
 *
 * Contains fundamental Polish terminology used throughout the application.
 * Key translations: cart → worek, credits → godzinki
 *
 * @module lib/config/constants/ui-core
 */

/**
 * Core Polish terminology used throughout the application
 * These strings are shared across multiple domains and components.
 */
export const CORE_UI_STRINGS = {
  // ==========================================================================
  // SPECIAL TERMINOLOGY
  // ==========================================================================

  /** Shopping cart → worek (bag) */
  CART: "worek",
  /** Credits (plural) → godzinki (little hours) */
  CREDITS: "godzinki",
  /** Credit (singular) → godzinka */
  CREDIT: "godzinka",
  /** Equipment */
  EQUIPMENT: "sprzęt",
  /** Reservation */
  RESERVATION: "rezerwacja",
  /** User */
  USER: "użytkownik",
  /** Administrator */
  ADMIN: "administrator",

  // ==========================================================================
  // COMMON NOUNS
  // ==========================================================================

  STATUS: "status",
  DATE: "data",
  ITEM: "przedmiot",
  ITEMS: "przedmioty",
  DAY: "dzień",
  DAYS: "dni",

  // ==========================================================================
  // COMMON ACTIONS (reusable across all domains)
  // ==========================================================================

  SAVE: "Zapisz",
  CANCEL: "Anuluj",
  DELETE: "Usuń",
  EDIT: "Edytuj",
  ADD: "Dodaj",
  REMOVE: "Usuń",
  SEARCH: "Szukaj",
  FILTER: "Filtruj",
  RESET: "Resetuj",
  CLOSE: "Zamknij",
  CONFIRM: "Potwierdź",
  BACK: "Wstecz",
  CONTINUE: "Kontynuuj",

  // ==========================================================================
  // LOADING STATES (reusable)
  // ==========================================================================

  LOADING: "Ładowanie...",
  SAVING: "Zapisywanie...",
} as const;

export type CoreUIStringKey = keyof typeof CORE_UI_STRINGS;
