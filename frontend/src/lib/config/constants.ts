// =============================================================================
// APPLICATION CONSTANTS
// =============================================================================

// Pagination defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// Debounce timings (milliseconds)
export const SEARCH_DEBOUNCE_MS = 300;
export const INPUT_DEBOUNCE_MS = 500;

// Date/Time constants
export const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
export const MIDNIGHT_HOURS = 0;
export const MIDNIGHT_MINUTES = 0;
export const MIDNIGHT_SECONDS = 0;
export const MIDNIGHT_MILLISECONDS = 0;

// UI Constants
export const MOBILE_BREAKPOINT = 1024; // lg breakpoint in Tailwind

// Z-Index layers
export const Z_INDEX_MODAL_BACKDROP = 50;
export const Z_INDEX_MODAL_CONTENT = 10;

// Icon sizes (Tailwind classes)
export const ICON_SIZE_SM = "h-4 w-4";
export const ICON_SIZE_MD = "h-5 w-5";
export const ICON_SIZE_LG = "h-6 w-6";

// Modal/Overlay
export const MODAL_BACKDROP_OPACITY = "50"; // as in bg-black/50
export const MODAL_MAX_HEIGHT = "90vh";

// Validation limits
export const MAX_SEARCH_LENGTH = 255;
export const MAX_UPLOAD_SIZE_MB = 10;

// Assets
export const PLACEHOLDER_EQUIPMENT_IMAGE = "/placeholder-equipment.svg";

// Storage keys
export const STORAGE_KEY_CART = "reservation-cart";
export const STORAGE_KEY_SUPABASE_AUTH = "sb-gwamxxqarkcpvgzvpanc-auth-token";
export const STORAGE_KEY_THEME = "theme";

// Localization
export const DEFAULT_LOCALE = "en-US";

// UI Feedback Timing (milliseconds)
export const FEEDBACK_DISPLAY_DURATION_MS = 3000;
export const CLEAR_CART_CONFIRM_TIMEOUT_MS = 3000;

// Cookie wait timing (milliseconds)
export const COOKIE_WAIT_TIMEOUT_MS = 300;
export const COOKIE_POLL_INTERVAL_MS = 50;
export const COOKIE_INITIAL_WAIT_MS = 100;
export const COOKIE_EXTENDED_WAIT_MS = 200;

// Redirect delays (milliseconds)
export const SUCCESS_REDIRECT_DELAY_MS = 1500;
export const MESSAGE_AUTO_DISMISS_MS = 5000;

// React Query
export const QUERY_STALE_TIME_MS = 1000 * 60; // 1 minute

// Reservation Defaults
export const DEFAULT_STATUS_FILTER = "ALL";
export const DEFAULT_SORT_OPTION = "created_desc";
export const MIXED_STATUS = "MIXED";

// =============================================================================
// RESERVATION STATUS CONFIGURATION
// =============================================================================

/**
 * Reservation status values matching database enum
 */
export const RESERVATION_STATUS = {
  PENDING: "PENDING",
  RENTED: "RENTED",
  RETURNED: "RETURNED",
  DENIED: "DENIED",
} as const;

/**
 * Human-readable labels for reservation statuses
 */
export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  RENTED: "Rented",
  RETURNED: "Returned",
  DENIED: "Cancelled",
  ALL: "All Statuses",
};

/**
 * Badge variants for each reservation status
 * Maps to Shadcn Badge component variants
 */
export const RESERVATION_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "default",
  RENTED: "secondary",
  RETURNED: "outline",
  DENIED: "destructive",
};

/**
 * Status filter options for reservation lists (including 'ALL')
 */
export const RESERVATION_FILTER_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "RENTED", label: "Rented" },
  { value: "RETURNED", label: "Returned" },
  { value: "DENIED", label: "Cancelled" },
] as const;

/**
 * Sort options for reservation lists
 */
export const RESERVATION_SORT_OPTIONS = [
  { value: "created_desc", label: "Newest First" },
  { value: "date_asc", label: "Start Date (Ascending)" },
  { value: "date_desc", label: "Start Date (Descending)" },
] as const;
