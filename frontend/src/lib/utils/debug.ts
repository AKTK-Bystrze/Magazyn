/**
 * Debug logging utility - only logs in development mode
 * Uses import.meta.env.DEV to conditionally output logs
 *
 * @example
 * ```typescript
 * import { debug } from '@/lib/utils/debug';
 *
 * logger.info(`[Availability] Checking equipment:`, { data: equipmentId });
 * logger.error(`[API] Request failed:`, { error: error });
 * ```
 */

const isDev = import.meta.env.DEV;

export const debug = {
  /**
   * Log debug information (only in development)
   * @param namespace - Category/module name for the log
   * @param args - Values to log
   */
  log: (namespace: string, ...args: unknown[]) => {
    if (isDev) console.log(`[${namespace}]`, ...args);
  },

  /**
   * Log error information (only in development)
   * @param namespace - Category/module name for the error
   * @param args - Error values to log
   */
  error: (namespace: string, ...args: unknown[]) => {
    if (isDev) console.error(`[${namespace}]`, ...args);
  },

  /**
   * Log warning information (only in development)
   * @param namespace - Category/module name for the warning
   * @param args - Warning values to log
   */
  warn: (namespace: string, ...args: unknown[]) => {
    if (isDev) console.warn(`[${namespace}]`, ...args);
  },
};
