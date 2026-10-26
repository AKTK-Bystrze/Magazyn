/**
 * Test ID constants for e2e tests.
 * Matches data-testid attributes in UI components.
 */
export const TEST_IDS = {
  EQUIPMENT_GRID: "equipment-grid",
  EQUIPMENT_SEARCH_CONTAINER: "equipment-search-container",

  CART_INDICATOR: "cart-indicator",
  CART_ITEM_COUNT: "cart-item-count",
  HEADER_CREDITS_BADGE: "header-credits-badge",
  CURRENT_CREDIT_BALANCE: "current-credit-balance",
  REMAINING_BALANCE: "reservation-remaining-balance",

  CONFIRMATION_CURRENT_BALANCE: "confirmation-current-balance",
  CONFIRMATION_REMAINING_BALANCE: "confirmation-remaining-balance",

  RESERVATION_LIST_CONTAINER: "reservation-list-container",

  ADMIN_USERS_TABLE: "admin-users-table",
  ADMIN_SEARCH_INPUT: "admin-search-input",
  ADMIN_EDIT_USER_MODAL: "admin-edit-user-modal",
  ADMIN_USER_ROLE_SELECT: "admin-user-role-select",
  ADMIN_USER_STATUS_ACTIVE: "admin-user-status-active",
  ADMIN_USER_STATUS_DISABLED: "admin-user-status-disabled",
  ADMIN_SAVE_USER_BTN: "admin-save-user-btn",
  ADMIN_SUCCESS_ALERT: "admin-success-alert",

  ADMIN_ADD_EQUIPMENT_BTN: "admin-add-equipment-btn",
  ADMIN_EQUIPMENT_TABLE: "admin-equipment-table",
  ADMIN_ADD_EQUIPMENT_DIALOG: "admin-add-equipment-dialog",
  ADMIN_ARCHIVE_EQUIPMENT_DIALOG: "admin-archive-equipment-dialog",
  ADMIN_ERROR_ALERT: "admin-error-alert",
  EQUIPMENT_FORM_INTERNAL_ID_INPUT: "equipment-form-internal-id-input",
  EQUIPMENT_FORM_TYPE_SELECT: "equipment-form-type-select",
  EQUIPMENT_FORM_NAME_INPUT: "equipment-form-name-input",
  EQUIPMENT_FORM_DESCRIPTION_INPUT: "equipment-form-description-input",
  EQUIPMENT_FORM_STATUS_SELECT: "equipment-form-status-select",
  EQUIPMENT_FORM_SUBMIT_BTN: "equipment-form-submit-btn",
  EQUIPMENT_FORM_CANCEL_BTN: "equipment-form-cancel-btn",
  EQUIPMENT_ARCHIVE_CONFIRM_BTN: "equipment-archive-confirm-btn",
  EQUIPMENT_ARCHIVE_CANCEL_BTN: "equipment-archive-cancel-btn",

  CREDIT_HISTORY_TABLE: "credit-history-table",
  CREDIT_HISTORY_EMPTY_STATE: "credit-history-empty-state",

  equipmentDetailsButton: (id: string) => `equipment-details-button-${id}`,
  cartItem: (id: string) => `cart-item-${id}`,
  adminUserRowEdit: (email: string) => `admin-user-row-edit-${email.replace(/[@.]/g, "-")}`,
  adminUserRowAdjustCredits: (email: string) =>
    `admin-user-row-adjust-credits-${email.replace(/[@.]/g, "-")}`,
  adminUserRowCreditBalance: (email: string) =>
    `admin-user-row-credits-${email.replace(/[@.]/g, "-")}`,
  adminUserRowStatus: (email: string) =>
    `admin-user-row-status-${email.replace(/[@.]/g, "-")}`,
  equipmentRow: (id: string) => `equipment-row-${id}`,
  equipmentEditBtn: (id: string) => `equipment-edit-btn-${id}`,
  equipmentArchiveBtn: (id: string) => `equipment-archive-btn-${id}`,
  equipmentActionsMenu: (id: string) => `equipment-actions-menu-${id}`,
  creditHistoryRow: (index: number) => `credit-history-row-${index}`,
} as const;
