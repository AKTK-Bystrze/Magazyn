/**
 * Pluralizes a word based on count
 *
 * @param count - The count to check
 * @param singular - The singular form of the word
 * @param plural - The plural form of the word (optional, defaults to singular + "s")
 * @returns The appropriate form of the word
 *
 * @example
 * pluralize(1, "day") // "day"
 * pluralize(2, "day") // "days"
 * pluralize(1, "item", "items") // "item"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`;
}
