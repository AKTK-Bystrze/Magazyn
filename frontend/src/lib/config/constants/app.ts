/**
 * Application-wide configuration constants
 *
 * Contains pagination defaults, timing values, storage keys,
 * and other app-wide settings.
 *
 * @module lib/config/constants/app
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const SEARCH_DEBOUNCE_MS = 300;
export const INPUT_DEBOUNCE_MS = 500;

export const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
export const MIDNIGHT_HOURS = 0;
export const MIDNIGHT_MINUTES = 0;
export const MIDNIGHT_SECONDS = 0;
export const MIDNIGHT_MILLISECONDS = 0;

/** lg breakpoint in Tailwind */
export const MOBILE_BREAKPOINT = 1024;

export const Z_INDEX_MODAL_BACKDROP = 50;
export const Z_INDEX_MODAL_CONTENT = 10;

export const ICON_SIZE_SM = "h-4 w-4";
export const ICON_SIZE_MD = "h-5 w-5";
export const ICON_SIZE_LG = "h-6 w-6";

export const SKELETON_ROW_COUNT = 5;

export const MODAL_BACKDROP_OPACITY = "50"; // as in bg-black/50
export const MODAL_MAX_HEIGHT = "90vh";

export const MAX_SEARCH_LENGTH = 255;
export const MAX_UPLOAD_SIZE_MB = 10;

export const PLACEHOLDER_EQUIPMENT_IMAGE = "/placeholder-equipment.svg";

export const STORAGE_KEY_CART = "reservation-cart";
export const STORAGE_KEY_SUPABASE_AUTH = "magazyn-auth-token";
export const STORAGE_KEY_THEME = "theme";

export const DEFAULT_LOCALE = "en-US";

export const FEEDBACK_DISPLAY_DURATION_MS = 3000;
export const CLEAR_CART_CONFIRM_TIMEOUT_MS = 3000;

export const COOKIE_WAIT_TIMEOUT_MS = 300;
export const COOKIE_POLL_INTERVAL_MS = 50;
export const COOKIE_INITIAL_WAIT_MS = 100;
export const COOKIE_EXTENDED_WAIT_MS = 200;

export const SUCCESS_REDIRECT_DELAY_MS = 1500;
export const MESSAGE_AUTO_DISMISS_MS = 5000;

/** 1 minute stale time */
export const QUERY_STALE_TIME_MS = 1000 * 60;
