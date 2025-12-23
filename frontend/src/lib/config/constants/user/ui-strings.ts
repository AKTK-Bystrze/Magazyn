/**
 * User UI strings (Polish)
 *
 * Validation error messages for user forms.
 *
 * @module lib/config/constants/user/ui-strings
 */

import { CREDIT_VALIDATION } from "../validation";

// =============================================================================
// USER VALIDATION
// =============================================================================

/**
 * Validation error messages for user forms
 */
export const USER_VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: "E-mail jest wymagany",
  EMAIL_INVALID: "Nieprawidłowy format e-mail",
  USERNAME_REQUIRED: "Nazwa użytkownika jest wymagana",
  USERNAME_INVALID:
    "Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślenia",
  CREDIT_BALANCE_INVALID: CREDIT_VALIDATION.BALANCE_INVALID,
  CREATE_FAILED: "Nie udało się utworzyć użytkownika",
  UPDATE_FAILED: "Nie udało się zaktualizować użytkownika",
} as const;
