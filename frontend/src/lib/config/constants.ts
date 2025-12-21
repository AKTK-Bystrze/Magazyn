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

// Table loading states
export const SKELETON_ROW_COUNT = 5;

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
export const STORAGE_KEY_SUPABASE_AUTH = "magazyn-auth-token";
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

// =============================================================================
// USER ROLE CONFIGURATION
// =============================================================================

/**
 * User role values matching database enum
 */
export const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

/**
 * Human-readable labels for user roles
 */
export const USER_ROLE_LABELS: Record<string, string> = {
  user: "User",
  admin: "Admin",
  super_admin: "Super Admin",
  ALL: "All Roles",
};

/**
 * Badge variants for each user role
 * Maps to Shadcn Badge component variants
 */
export const USER_ROLE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  user: "outline",
  admin: "secondary",
  super_admin: "default",
};

/**
 * Role filter options for user lists (including 'ALL')
 */
export const USER_ROLE_FILTER_OPTIONS = [
  { value: "ALL", label: "All Roles" },
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
] as const;

/**
 * Default filter for user role
 */
export const DEFAULT_ROLE_FILTER = "ALL";

// =============================================================================
// USER VALIDATION MESSAGES
// =============================================================================

/**
 * Validation error messages for user forms
 * Centralized for consistency and i18n readiness
 */
export const USER_VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Invalid email format",
  USERNAME_REQUIRED: "Username is required",
  USERNAME_INVALID: "Username can only contain letters, numbers, and underscores",
  CREDIT_BALANCE_INVALID: "Credit balance must be non-negative",
  CREATE_FAILED: "Failed to create user",
  UPDATE_FAILED: "Failed to update user",
} as const;

/**
 * Validation patterns for user forms
 */
export const USER_VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_]+$/,
} as const;

// =============================================================================
// EQUIPMENT FILTER UI STRINGS
// =============================================================================

/**
 * UI text strings for equipment filters
 * Centralized for consistency and i18n readiness
 */
export const EQUIPMENT_FILTER_UI_STRINGS = {
  FILTER_BY_AVAILABILITY: "Filter by Availability",
  SEARCH_PLACEHOLDER: "Search by name...",
  ALL_TYPES: "All Types",
  EQUIPMENT_TYPE_LABEL: "Equipment Type",
  AVAILABILITY_LABEL: "Availability",
  STATUS_ALL: "All",
  STATUS_AVAILABLE: "Available",
  STATUS_BROKEN: "Broken/Unavailable",
  STATUS_BLOCKED: "Blocked",
  RESET_FILTERS: "Reset Filters",
  CLEAR_DATES: "Clear",
} as const;

// =============================================================================
// RESERVATION STATUS VIEW UI STRINGS
// =============================================================================

/**
 * UI text strings for reservation status view
 * Centralized for consistency and i18n readiness
 */
export const RESERVATION_STATUS_VIEW_UI_STRINGS = {
  // Page title
  RESERVATION_DETAILS: "Reservation Details",
  BACK_TO_LIST: "Back to Reservations",

  // Section headers
  RESERVATION_INFO: "Reservation Information",
  AUDIT_HISTORY: "Change History",

  // Info labels
  EQUIPMENT: "Equipment",
  DATES: "Dates",
  CREDIT_COST: "Credit Cost",
  USER: "User",
  CREATED_AT: "Created",

  // Action buttons
  CANCEL_RESERVATION: "Cancel Reservation",
  MARK_RETURNED: "Mark as Returned",
  CHANGE_STATUS: "Change Status",

  // Confirmation messages
  CONFIRM_CANCEL_TITLE: "Cancel Reservation?",
  CONFIRM_CANCEL_MESSAGE:
    "This action cannot be undone. The equipment will become available for others to reserve.",
  CONFIRM_REFUND_LABEL: "Refund Amount:",
  CONFIRM_CANCEL_BUTTON: "Cancel Reservation",
  KEEP_RESERVATION: "Keep Reservation",

  CONFIRM_MARK_RETURNED_TITLE: "Mark as Returned?",
  CONFIRM_MARK_RETURNED_MESSAGE:
    "Confirm that this equipment has been returned and is back in inventory.",
  CONFIRM_MARK_RETURNED_BUTTON: "Mark as Returned",

  CONFIRM_STATUS_CHANGE_TITLE: "Change Reservation Status?",
  CONFIRM_STATUS_CHANGE_MESSAGE: "You are changing the status from",
  CONFIRM_STATUS_CHANGE_BUTTON: "Change Status",
  CANCEL_CHANGE: "Cancel",

  // Success messages
  STATUS_CHANGED_SUCCESS: "Reservation status changed successfully",
  CANCELLED_SUCCESS: "Reservation cancelled. Credits have been refunded.",
  MARKED_RETURNED_SUCCESS: "Reservation marked as returned",

  // Error messages
  UNAUTHORIZED: "You don't have permission to view this reservation",
  NOT_FOUND: "Reservation not found",
  CONFLICT: "The reservation status has already been changed",
  NETWORK_ERROR: "Connection error. Please try again",
  STATUS_CHANGE_FAILED: "Failed to change reservation status",

  // Loading states
  LOADING: "Loading...",
  UPDATING: "Updating...",

  // Audit timeline
  CHANGED_BY: "Changed by",
  INITIAL_CREATION: "Reservation created",
  SYSTEM: "System",
} as const;

// =============================================================================
// RESERVATION DATE MODIFICATION UI STRINGS
// =============================================================================

/**
 * UI text strings for date modification dialogs
 * Centralized for consistency and i18n readiness
 */
export const RESERVATION_DATE_MODIFICATION_UI_STRINGS = {
  // Modify Dates Dialog
  MODIFY_DATES_TITLE: "Modify Reservation Dates",
  MODIFY_DATES_DESCRIPTION:
    "Change the start and end dates for this reservation. Credits will be adjusted based on the new duration.",
  MODIFY_DATES_BUTTON: "Modify Dates",
  CONFIRM_CHANGES: "Confirm Changes",
  CANCEL_CHANGES: "Cancel",

  // Return with Dates Dialog
  RETURN_WITH_DATES_TITLE: "Mark as Returned",
  RETURN_WITH_DATES_DESCRIPTION:
    "Mark this reservation as returned. You can optionally modify the dates before returning.",
  MODIFY_DATES_BEFORE_RETURN: "Modify dates before returning",
  MODIFY_DATES_CHECKBOX_HINT:
    "Check this if the equipment was returned earlier or later than planned",
  CONFIRM_RETURN: "Confirm Return",
  FINAL_STATUS_WARNING: "⚠️ RETURNED is a final status and cannot be changed afterwards.",

  // Credit Adjustment
  CREDIT_ADJUSTMENT_TITLE: "Credit Adjustment",
  DATE_COMPARISON: "Date Comparison",
  ORIGINAL_DATES: "Original",
  NEW_DATES: "New",
  CREDIT_ADJUSTMENT: "Credit Adjustment",
  CURRENT_BALANCE: "Current Balance",
  NEW_BALANCE: "New Balance",

  // Warnings
  SIGNIFICANT_EXTENSION_WARNING: "Significant Extension Detected",
  INSUFFICIENT_CREDITS_WARNING:
    "Insufficient credits. You need {amount} more credits to complete this modification.",

  // Validation Errors
  START_DATE_REQUIRED: "Start date is required",
  END_DATE_REQUIRED: "End date is required",
  START_DATE_MUST_BE_FUTURE: "Start date must be in the future",
  END_DATE_MUST_BE_AFTER_START: "End date must be on or after start date",
  EQUIPMENT_NOT_AVAILABLE: "Equipment not available for selected dates",
  DATES_MUST_CHANGE: "Please select different dates to modify the reservation",

  // Success Messages
  DATES_MODIFIED_SUCCESS: "Reservation dates modified successfully",
  RETURNED_WITH_DATES_SUCCESS: "Reservation marked as returned and dates updated",
  RETURNED_SUCCESS: "Reservation marked as returned",

  // Loading States
  VALIDATING_DATES: "Validating dates...",
  UPDATING_RESERVATION: "Updating reservation...",
} as const;

// =============================================================================
// EQUIPMENT MANAGER UI STRINGS
// =============================================================================

/**
 * Equipment status values matching database enum
 */
export const EQUIPMENT_STATUS = {
  OK: "ok",
  BROKEN: "broken",
  BLOCKED: "blocked",
} as const;

/**
 * Human-readable labels for equipment statuses
 */
export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  broken: "Broken",
  blocked: "Blocked",
  ALL: "All Statuses",
};

/**
 * Equipment status filter options for equipment lists (including 'ALL')
 */
export const EQUIPMENT_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "ok", label: "OK" },
  { value: "broken", label: "Broken" },
  { value: "blocked", label: "Blocked" },
] as const;

/**
 * Default filter for equipment status
 */
export const DEFAULT_EQUIPMENT_STATUS_FILTER = "ALL";

/**
 * Validation error messages for equipment forms
 * Centralized for consistency and i18n readiness
 */
export const EQUIPMENT_VALIDATION_MESSAGES = {
  INTERNAL_ID_REQUIRED: "Internal ID is required",
  TYPE_ID_REQUIRED: "Equipment type is required",
  NAME_MAX_LENGTH: "Name must be 200 characters or less",
  IMAGE_MAX_SIZE: "Image must be 2MB or smaller",
  IMAGE_INVALID_TYPE: "Only JPEG and PNG images are allowed",
  CREATE_FAILED: "Failed to create equipment",
  UPDATE_FAILED: "Failed to update equipment",
  ARCHIVE_FAILED: "Failed to archive equipment",
  ARCHIVE_HAS_ACTIVE_RESERVATIONS: "Cannot archive equipment with active reservations",
  INTERNAL_ID_EXISTS: "Internal ID already exists for this type",
} as const;

/**
 * UI text strings for equipment manager view
 */
export const EQUIPMENT_MANAGER_UI_STRINGS = {
  // Page title
  PAGE_TITLE: "Equipment Manager",
  PAGE_DESCRIPTION: "Manage equipment inventory, add new items, and track maintenance.",

  // Actions
  ADD_EQUIPMENT: "Add Equipment",
  EDIT_EQUIPMENT: "Edit Equipment",
  VIEW_DETAILS: "View Details",
  ARCHIVE_EQUIPMENT: "Archive",
  TOGGLE_STATUS: "Toggle Status",

  // Filters
  SEARCH_PLACEHOLDER: "Search by name or ID...",
  ALL_TYPES: "All Types",
  FILTER_BY_TYPE: "Filter by Type",
  FILTER_BY_STATUS: "Filter by Status",
  RESET_FILTERS: "Reset",

  // Table headers
  INTERNAL_ID: "ID",
  NAME: "Name",
  TYPE: "Type",
  STATUS: "Status",
  CREDIT_COST: "Cost/Day",
  CREATED: "Created",
  ACTIONS: "Actions",

  // Dialogs
  ADD_DIALOG_TITLE: "Add New Equipment",
  ADD_DIALOG_DESCRIPTION: "Add a new piece of equipment to the inventory.",
  EDIT_DIALOG_TITLE: "Edit Equipment",
  EDIT_DIALOG_DESCRIPTION: "Update equipment information.",
  ARCHIVE_DIALOG_TITLE: "Archive Equipment?",
  ARCHIVE_DIALOG_MESSAGE: "This will hide the equipment from the catalog. It cannot be reserved but can be restored later.",
  ARCHIVE_BUTTON: "Archive Equipment",
  CANCEL_BUTTON: "Cancel",
  SAVE_BUTTON: "Save Changes",
  CREATE_BUTTON: "Create Equipment",

  // Form fields
  FORM_INTERNAL_ID: "Internal ID",
  FORM_INTERNAL_ID_PLACEHOLDER: "e.g., CAM-001",
  FORM_TYPE: "Equipment Type",
  FORM_TYPE_PLACEHOLDER: "Select a type...",
  FORM_NAME: "Display Name",
  FORM_NAME_PLACEHOLDER: "Optional display name",
  FORM_DESCRIPTION: "Description",
  FORM_DESCRIPTION_PLACEHOLDER: "Optional description...",
  FORM_STATUS: "Status",
  FORM_IMAGE: "Image",

  // Details sheet
  DETAILS_TITLE: "Equipment Details",
  MAINTENANCE_HISTORY: "Maintenance History",
  RESERVATION_HISTORY: "Reservation History",
  ADD_MAINTENANCE_LOG: "Add Maintenance Note",
  NO_MAINTENANCE_HISTORY: "No maintenance history recorded",
  NO_RESERVATION_HISTORY: "No reservations yet",

  // Empty state
  NO_EQUIPMENT: "No equipment found",
  NO_EQUIPMENT_HINT: "Try adjusting your filters or add new equipment.",

  // Success messages
  CREATED_SUCCESS: "Equipment created successfully",
  UPDATED_SUCCESS: "Equipment updated successfully",
  ARCHIVED_SUCCESS: "Equipment archived successfully",
  STATUS_CHANGED_SUCCESS: "Equipment status changed",
  MAINTENANCE_LOG_ADDED: "Maintenance note added",

  // Loading states
  LOADING: "Loading...",
  SAVING: "Saving...",
} as const;

// =============================================================================
// CREDIT HISTORY UI STRINGS
// =============================================================================

/**
 * UI text strings for credit history view
 */
export const CREDIT_HISTORY_UI_STRINGS = {
  PAGE_TITLE: "Credit History",
  PAGE_DESCRIPTION: "View your credit transactions, including charges for reservations and work credits.",
  CURRENT_BALANCE: "Current Balance",
  TABLE_DATE: "Date",
  TABLE_REASON: "Reason",
  TABLE_DESCRIPTION: "Description",
  TABLE_AMOUNT: "Amount",
  TABLE_AUTHOR: "By",
  REASON_RESERVATION_CHARGE: "Reservation Charge",
  REASON_RESERVATION_REFUND: "Reservation Refund",
  REASON_RESERVATION_ADJUSTMENT: "Reservation Adjustment",
  REASON_ADMIN_ADJUSTMENT: "Admin Adjustment",
  REASON_WORK_CREDIT: "Work Credit",
  NO_HISTORY: "No credit transactions found.",
  ERROR_FETCHING: "Failed to load credit history.",
} as const;
