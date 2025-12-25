/**
 * Test ID constants for e2e tests.
 * Matches data-testid attributes in UI components.
 */
export const TEST_IDS = {
  // Layout
  TOPBAR: 'topbar',
  USER_MENU_TRIGGER: 'user-menu-trigger',
  LOGOUT_BUTTON: 'logout-button',
  
  // Equipment
  EQUIPMENT_GRID: 'equipment-grid',
  EQUIPMENT_GRID_EMPTY: 'equipment-grid-empty',
  EQUIPMENT_SEARCH_CONTAINER: 'equipment-search-container',
  
  // Cart
  CART_INDICATOR: 'cart-indicator',
  CART_ITEM_COUNT: 'cart-item-count',
  RESERVATION_CART: 'reservation-cart',
  RESERVATION_TOTAL_COST: 'reservation-total-cost',
  CREDIT_BALANCE: 'reservation-credit-balance',
  REMAINING_BALANCE: 'reservation-remaining-balance',
  CONFIRM_RESERVATION_BUTTON: 'confirm-reservation-button',
  CANCEL_RESERVATION_BUTTON: 'cancel-reservation-button',
  RESERVATION_SUCCESS_MESSAGE: 'reservation-success-message',
  
  // Date Picker
  DATE_PICKER_START: 'date-picker-start',
  DATE_PICKER_END: 'date-picker-end',
  DATE_VALIDATION_ERROR: 'date-validation-error',
  
  // Confirmation Modal
  CONFIRMATION_CURRENT_BALANCE: 'confirmation-current-balance',
  CONFIRMATION_REMAINING_BALANCE: 'confirmation-remaining-balance',

  // Reservation List
  RESERVATION_LIST_CONTAINER: 'reservation-list-container',

  // Admin Users
  ADMIN_USERS_TABLE: 'admin-users-table',
  ADMIN_SEARCH_INPUT: 'admin-search-input',
  ADMIN_EDIT_USER_MODAL: 'admin-edit-user-modal',
  ADMIN_USER_ROLE_SELECT: 'admin-user-role-select',
  ADMIN_USER_STATUS_ACTIVE: 'admin-user-status-active',
  ADMIN_USER_STATUS_DISABLED: 'admin-user-status-disabled',
  ADMIN_SAVE_USER_BTN: 'admin-save-user-btn',
  ADMIN_SUCCESS_ALERT: 'admin-success-alert',

  // Admin Equipment Manager
  ADMIN_ADD_EQUIPMENT_BTN: 'admin-add-equipment-btn',
  ADMIN_EQUIPMENT_TABLE: 'admin-equipment-table',
  ADMIN_ADD_EQUIPMENT_DIALOG: 'admin-add-equipment-dialog',
  ADMIN_EDIT_EQUIPMENT_DIALOG: 'admin-edit-equipment-dialog',
  ADMIN_ARCHIVE_EQUIPMENT_DIALOG: 'admin-archive-equipment-dialog',
  ADMIN_ERROR_ALERT: 'admin-error-alert',
  EQUIPMENT_FORM_INTERNAL_ID_INPUT: 'equipment-form-internal-id-input',
  EQUIPMENT_FORM_TYPE_SELECT: 'equipment-form-type-select',
  EQUIPMENT_FORM_NAME_INPUT: 'equipment-form-name-input',
  EQUIPMENT_FORM_DESCRIPTION_INPUT: 'equipment-form-description-input',
  EQUIPMENT_FORM_STATUS_SELECT: 'equipment-form-status-select',
  EQUIPMENT_FORM_SUBMIT_BTN: 'equipment-form-submit-btn',
  EQUIPMENT_FORM_CANCEL_BTN: 'equipment-form-cancel-btn',
  EQUIPMENT_FORM_ERROR: 'equipment-form-error',
  EQUIPMENT_ARCHIVE_CONFIRM_BTN: 'equipment-archive-confirm-btn',
  EQUIPMENT_ARCHIVE_CANCEL_BTN: 'equipment-archive-cancel-btn',

  // Credit History
  CREDIT_HISTORY_TABLE: 'credit-history-table',
  CREDIT_HISTORY_EMPTY_STATE: 'credit-history-empty-state',

  // Dynamic IDs (functions)
  equipmentCard: (id: string) => `equipment-card-${id}`,
  equipmentAddToCart: (id: string) => `equipment-add-to-cart-${id}`,
  equipmentDetailsButton: (id: string) => `equipment-details-button-${id}`,
  equipmentStatusBadge: (id: string) => `equipment-status-badge-${id}`,
  cartItem: (id: string) => `cart-item-${id}`,
  cartItemRemove: (id: string) => `cart-item-remove-${id}`,
  reservationRow: (id: string) => `reservation-row-${id}`,
  reservationStatus: (id: string) => `reservation-status-${id}`,
  adminUserRowEdit: (email: string) => `admin-user-row-edit-${email.replace(/[@.]/g, '-')}`,
  equipmentRow: (id: string) => `equipment-row-${id}`,
  equipmentEditBtn: (id: string) => `equipment-edit-btn-${id}`,
  equipmentArchiveBtn: (id: string) => `equipment-archive-btn-${id}`,
  equipmentViewDetailsBtn: (id: string) => `equipment-view-details-btn-${id}`,
  equipmentActionsMenu: (id: string) => `equipment-actions-menu-${id}`,
  creditHistoryRow: (index: number) => `credit-history-row-${index}`,
} as const;
