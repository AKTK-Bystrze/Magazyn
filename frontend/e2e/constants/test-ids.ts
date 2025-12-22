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

  // Dynamic IDs (functions)
  equipmentCard: (id: string) => `equipment-card-${id}`,
  equipmentAddToCart: (id: string) => `equipment-add-to-cart-${id}`,
  equipmentDetailsButton: (id: string) => `equipment-details-button-${id}`,
  equipmentStatusBadge: (id: string) => `equipment-status-badge-${id}`,
  cartItem: (id: string) => `cart-item-${id}`,
  cartItemRemove: (id: string) => `cart-item-remove-${id}`,
  reservationRow: (id: string) => `reservation-row-${id}`,
  reservationStatus: (id: string) => `reservation-status-${id}`,
} as const;
