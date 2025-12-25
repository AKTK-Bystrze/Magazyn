/**
 * User Utility Functions
 *
 * Helper functions for user-related operations like generating initials,
 * formatting names, etc.
 *
 * @module lib/utils/user-utils
 */

/**
 * Generates two-character initials from an email address
 *
 * Takes the username portion (before @) and returns the first
 * two characters in uppercase.
 *
 * @param email - User email address
 * @returns Two-character uppercase initials
 *
 * @example
 * getInitials('john.doe@example.com') // Returns 'JO'
 * getInitials('admin@company.com')    // Returns 'AD'
 */
export function getInitials(email: string): string {
  const name = email.split("@")[0];
  return name.substring(0, 2).toUpperCase();
}
