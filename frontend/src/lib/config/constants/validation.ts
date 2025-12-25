/**
 * Validation messages and patterns (Polish)
 *
 * Consolidated validation strings from error-messages.ts
 * and domain-specific validation constants.
 *
 * @module lib/config/constants/validation
 */

// =============================================================================
// DATE VALIDATION
// =============================================================================

/**
 * Date validation error messages
 */
export const DATE_VALIDATION = {
  START_DATE_PAST: "Data rozpoczęcia musi być w przyszłości",
  END_DATE_BEFORE_START: "Data zakończenia musi być po dacie rozpoczęcia",
  START_DATE_REQUIRED: "Data rozpoczęcia jest wymagana",
  END_DATE_REQUIRED: "Data zakończenia jest wymagana",
  START_DATE_MUST_BE_FUTURE: "Data rozpoczęcia musi być w przyszłości",
  END_DATE_MUST_BE_AFTER_START:
    "Data zakończenia musi być równa lub późniejsza niż data rozpoczęcia",
  DATES_MUST_CHANGE: "Wybierz inne daty, aby zmodyfikować rezerwację",
} as const;

// =============================================================================
// AVAILABILITY VALIDATION
// =============================================================================

/**
 * Availability validation error messages
 */
export const AVAILABILITY_VALIDATION = {
  /**
   * Returns message for unavailable items count
   * Uses simple Polish pluralization
   */
  ITEMS_UNAVAILABLE: (count: number) =>
    `${count} ${count === 1 ? "przedmiot niedostępny" : "przedmioty niedostępne"}`,
  UNAVAILABLE_FOR_DATES: "Niedostępne dla wybranych dat",
  EQUIPMENT_NOT_AVAILABLE: "Sprzęt niedostępny dla wybranych dat",
  CHECK_FAILED: "Nie udało się sprawdzić dostępności",
  SELECT_DATES: "Wybierz daty rozpoczęcia i zakończenia, aby kontynuować.",
} as const;

// =============================================================================
// CREDIT VALIDATION
// =============================================================================

/**
 * Credit/balance validation error messages
 */
export const CREDIT_VALIDATION = {
  /**
   * Returns message for insufficient credits
   * @param needed - Number of additional credits needed
   */
  INSUFFICIENT: (needed: number) =>
    `Niewystarczająca liczba godzinek. Potrzebujesz ${needed} więcej godzinek.`,
  BALANCE_INVALID: "Saldo godzinek musi być nieujemne",
} as const;

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

/**
 * Regular expression patterns for form validation
 */
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_]+$/,
} as const;

// =============================================================================
// LEGACY EXPORTS (for backward compatibility during migration)
// =============================================================================

// Date validation errors (from error-messages.ts)
export const ERROR_START_DATE_PAST = DATE_VALIDATION.START_DATE_PAST;
export const ERROR_END_DATE_BEFORE_START = DATE_VALIDATION.END_DATE_BEFORE_START;

// Availability errors (from error-messages.ts)
export const ERROR_ITEMS_UNAVAILABLE = AVAILABILITY_VALIDATION.ITEMS_UNAVAILABLE;
export const ERROR_UNAVAILABLE_FOR_DATES = AVAILABILITY_VALIDATION.UNAVAILABLE_FOR_DATES;

// Credit balance errors (from error-messages.ts)
export const ERROR_INSUFFICIENT_CREDITS = CREDIT_VALIDATION.INSUFFICIENT;

// General errors (from error-messages.ts)
export const ERROR_AVAILABILITY_CHECK_FAILED = AVAILABILITY_VALIDATION.CHECK_FAILED;
export const ERROR_SELECT_DATES = AVAILABILITY_VALIDATION.SELECT_DATES;
